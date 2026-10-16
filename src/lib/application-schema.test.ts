import { describe, expect, it } from "vitest";
import { importRowSchema, importRowsSchema, updateApplicationSchema } from "./application-schema";

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "row-1",
    company: "Acme",
    position: "Engineer",
    location: null,
    salary: null,
    jobUrl: "https://acme.com/jobs/1",
    dateApplied: null,
    status: "applied",
    source: "linkedin",
    contactName: null,
    contactEmail: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("importRowSchema", () => {
  it("accepts a well-formed row unchanged", () => {
    const result = importRowSchema.parse(validRow());
    expect(result.company).toBe("Acme");
    expect(result.jobUrl).toBe("https://acme.com/jobs/1");
  });

  it("sanitizes a javascript: URI in jobUrl to null instead of rejecting the row", () => {
    const result = importRowSchema.parse(validRow({ jobUrl: "javascript:alert(document.cookie)" }));
    expect(result.jobUrl).toBeNull();
  });

  it("sanitizes a data: URI in jobUrl to null", () => {
    const result = importRowSchema.parse(validRow({ jobUrl: "data:text/html,<script>alert(1)</script>" }));
    expect(result.jobUrl).toBeNull();
  });

  it("sanitizes plain non-URL text in jobUrl to null rather than storing garbage", () => {
    const result = importRowSchema.parse(validRow({ jobUrl: "see recruiter email" }));
    expect(result.jobUrl).toBeNull();
  });

  it("keeps a plain http:// URL (not just https)", () => {
    const result = importRowSchema.parse(validRow({ jobUrl: "http://acme.com/jobs/1" }));
    expect(result.jobUrl).toBe("http://acme.com/jobs/1");
  });

  it("rejects a status value outside the known enum", () => {
    const result = importRowSchema.safeParse(validRow({ status: "hired!!!" }));
    expect(result.success).toBe(false);
  });

  it("rejects a source value outside the known enum", () => {
    const result = importRowSchema.safeParse(validRow({ source: "carrier pigeon" }));
    expect(result.success).toBe(false);
  });

  it("rejects a row with an excessively long notes field", () => {
    const result = importRowSchema.safeParse(validRow({ notes: "x".repeat(5001) }));
    expect(result.success).toBe(false);
  });

  it("rejects a row missing a required id", () => {
    const result = importRowSchema.safeParse(validRow({ id: "" }));
    expect(result.success).toBe(false);
  });

  it("accepts null for every optional field", () => {
    const result = importRowSchema.safeParse(
      validRow({
        company: null,
        position: null,
        location: null,
        salary: null,
        jobUrl: null,
        dateApplied: null,
        status: null,
        source: null,
        contactName: null,
        contactEmail: null,
        notes: null,
      })
    );
    expect(result.success).toBe(true);
  });
});

describe("importRowsSchema", () => {
  it("rejects a batch larger than 5000 rows", () => {
    const rows = Array.from({ length: 5001 }, (_, i) => validRow({ id: `row-${i}` }));
    const result = importRowsSchema.safeParse(rows);
    expect(result.success).toBe(false);
  });

  it("accepts an empty batch", () => {
    const result = importRowsSchema.safeParse([]);
    expect(result.success).toBe(true);
  });
});

describe("updateApplicationSchema", () => {
  const validUpdate = {
    company: "Acme",
    position: "Engineer",
    location: null,
    salary: null,
    jobUrl: "https://acme.com/jobs/1",
    dateApplied: null,
    status: "interview",
    source: "linkedin",
    contactName: null,
    contactEmail: null,
    notes: null,
  };

  it("accepts a well-formed edit", () => {
    const result = updateApplicationSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("does not require an id or timestamps — those are server-owned", () => {
    const result = updateApplicationSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("createdAt");
    }
  });

  it("sanitizes a javascript: URI in jobUrl to null, same as import", () => {
    const result = updateApplicationSchema.parse({
      ...validUpdate,
      jobUrl: "javascript:alert(1)",
    });
    expect(result.jobUrl).toBeNull();
  });

  it("rejects a status value outside the known enum", () => {
    const result = updateApplicationSchema.safeParse({ ...validUpdate, status: "hired!!!" });
    expect(result.success).toBe(false);
  });
});
