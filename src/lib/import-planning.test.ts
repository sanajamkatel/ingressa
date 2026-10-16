import { describe, expect, it } from "vitest";
import { planImportWrites } from "./import-planning";
import type { Application } from "./types";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `id-${idCounter}`;
}

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: nextId(),
    company: null,
    position: null,
    location: null,
    salary: null,
    jobUrl: null,
    dateApplied: null,
    status: null,
    statusManuallySet: false,
    source: null,
    contactName: null,
    contactEmail: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("planImportWrites", () => {
  it("returns empty plans when there is nothing to import and nothing existing", () => {
    const plan = planImportWrites([], []);

    expect(plan.newRecords).toEqual([]);
    expect(plan.changedRecords).toEqual([]);
    expect(plan.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 0 });
  });

  it("treats every row as new when there are no existing applications", () => {
    const imported = [
      makeApp({ company: "Acme", position: "Engineer" }),
      makeApp({ company: "Globex", position: "Designer" }),
    ];

    const plan = planImportWrites([], imported);

    expect(plan.newRecords).toHaveLength(2);
    expect(plan.newRecords.map((a) => a.company)).toEqual(["Acme", "Globex"]);
    expect(plan.changedRecords).toEqual([]);
    expect(plan.stats).toEqual({ newCount: 2, updatedCount: 0, skippedCount: 0 });
  });

  it("produces no writes at all for an exact duplicate with nothing new to add", () => {
    const existing = [makeApp({ company: "Acme", position: "Engineer", location: "Austin" })];
    const imported = [makeApp({ company: "Acme", position: "Engineer", location: "Austin" })];

    const plan = planImportWrites(existing, imported);

    expect(plan.newRecords).toEqual([]);
    expect(plan.changedRecords).toEqual([]);
    expect(plan.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 1 });
  });

  it("puts a record that gained a previously-null field into changedRecords, not newRecords", () => {
    const existing = [makeApp({ company: "Acme", position: "Engineer", location: null })];
    const imported = [makeApp({ company: "Acme", position: "Engineer", location: "Remote" })];

    const plan = planImportWrites(existing, imported);

    expect(plan.newRecords).toEqual([]);
    expect(plan.changedRecords).toHaveLength(1);
    expect(plan.changedRecords[0].location).toBe("Remote");
    expect(plan.changedRecords[0].id).toBe(existing[0].id);
    expect(plan.stats).toEqual({ newCount: 0, updatedCount: 1, skippedCount: 0 });
  });

  it("never overwrites a field that already has a value, even when the import row disagrees", () => {
    const existing = [
      makeApp({ company: "Acme", position: "Engineer", location: "Austin", salary: null }),
    ];
    const imported = [
      makeApp({ company: "Acme", position: "Engineer", location: "Remote", salary: "120k" }),
    ];

    const plan = planImportWrites(existing, imported);

    // location was already set -> must stay "Austin"; salary was null -> gets filled in.
    expect(plan.changedRecords).toHaveLength(1);
    expect(plan.changedRecords[0].location).toBe("Austin");
    expect(plan.changedRecords[0].salary).toBe("120k");
  });

  it("merges two import rows matching the same existing record without duplicating it", () => {
    const existing = [
      makeApp({ company: "Acme", position: "Engineer", location: null, salary: null }),
    ];
    const imported = [
      makeApp({ company: "Acme", position: "Engineer", location: "Remote" }),
      makeApp({ company: "Acme", position: "Engineer", salary: "120k" }),
    ];

    const plan = planImportWrites(existing, imported);

    expect(plan.newRecords).toEqual([]);
    expect(plan.changedRecords).toHaveLength(1);
    expect(plan.changedRecords[0].location).toBe("Remote");
    expect(plan.changedRecords[0].salary).toBe("120k");
  });

  it("treats rows with both company and position null as always new, never merged together", () => {
    const existing = [makeApp({ company: null, position: null, notes: "first blank row" })];
    const imported = [makeApp({ company: null, position: null, notes: "second blank row" })];

    const plan = planImportWrites(existing, imported);

    expect(plan.newRecords).toHaveLength(1);
    expect(plan.newRecords[0].notes).toBe("second blank row");
    expect(plan.changedRecords).toEqual([]);
    // The existing blank row must be untouched, not merged with the new blank row.
    expect(existing[0].notes).toBe("first blank row");
  });

  it("matches company/position case- and whitespace-insensitively", () => {
    const existing = [
      makeApp({ company: "Acme Corp", position: "Software Engineer", location: null }),
    ];
    const imported = [makeApp({ company: " ACME   corp ", position: "software engineer", location: "Remote" })];

    const plan = planImportWrites(existing, imported);

    expect(plan.newRecords).toEqual([]);
    expect(plan.changedRecords).toHaveLength(1);
    expect(plan.changedRecords[0].location).toBe("Remote");
  });

  it("correctly buckets a mixed batch of new, changed, and unchanged rows", () => {
    const existing = [
      makeApp({ company: "Acme", position: "Engineer", location: null }), // will change
      makeApp({ company: "Globex", position: "Designer", location: "Austin" }), // unchanged
    ];
    const imported = [
      makeApp({ company: "Acme", position: "Engineer", location: "Remote" }), // merges into existing[0]
      makeApp({ company: "Globex", position: "Designer", location: "Austin" }), // exact duplicate, no-op
      makeApp({ company: "Initech", position: "PM" }), // brand new
    ];

    const plan = planImportWrites(existing, imported);

    expect(plan.newRecords).toHaveLength(1);
    expect(plan.newRecords[0].company).toBe("Initech");

    expect(plan.changedRecords).toHaveLength(1);
    expect(plan.changedRecords[0].company).toBe("Acme");
    expect(plan.changedRecords[0].location).toBe("Remote");

    expect(plan.stats).toEqual({ newCount: 1, updatedCount: 1, skippedCount: 1 });
  });

  it("leaves status untouched by default, even when allowStatusProgression is omitted", () => {
    const existing = [makeApp({ company: "Acme", position: "Engineer", status: "applied" })];
    const imported = [makeApp({ company: "Acme", position: "Engineer", status: "interview" })];

    const plan = planImportWrites(existing, imported);

    expect(plan.changedRecords).toEqual([]);
    expect(plan.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 1 });
  });

  it("moves status forward when allowStatusProgression is enabled", () => {
    const existing = [makeApp({ company: "Acme", position: "Engineer", status: "applied" })];
    const imported = [makeApp({ company: "Acme", position: "Engineer", status: "interview" })];

    const plan = planImportWrites(existing, imported, { allowStatusProgression: true });

    expect(plan.changedRecords).toHaveLength(1);
    expect(plan.changedRecords[0].status).toBe("interview");
    expect(plan.stats).toEqual({ newCount: 0, updatedCount: 1, skippedCount: 0 });
  });

  it("never moves status backward even with allowStatusProgression enabled", () => {
    const existing = [makeApp({ company: "Acme", position: "Engineer", status: "interview" })];
    const imported = [makeApp({ company: "Acme", position: "Engineer", status: "applied" })];

    const plan = planImportWrites(existing, imported, { allowStatusProgression: true });

    expect(plan.changedRecords).toEqual([]);
    expect(plan.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 1 });
  });

  it("locks in whichever terminal status (offer/rejected) is reached first", () => {
    const existing = [makeApp({ company: "Acme", position: "Engineer", status: "offer" })];
    const imported = [makeApp({ company: "Acme", position: "Engineer", status: "rejected" })];

    const plan = planImportWrites(existing, imported, { allowStatusProgression: true });

    expect(plan.changedRecords).toEqual([]);
    expect(existing[0].status).toBe("offer");
  });

  it("never moves status when the user has set it by hand, even on a forward move", () => {
    const existing = [
      makeApp({
        company: "Acme",
        position: "Engineer",
        status: "applied",
        statusManuallySet: true,
      }),
    ];
    const imported = [makeApp({ company: "Acme", position: "Engineer", status: "interview" })];

    const plan = planImportWrites(existing, imported, { allowStatusProgression: true });

    expect(plan.changedRecords).toEqual([]);
    expect(existing[0].status).toBe("applied");
    expect(plan.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 1 });
  });

  it("fills status when it was null, regardless of allowStatusProgression", () => {
    const existing = [makeApp({ company: "Acme", position: "Engineer", status: null })];
    const imported = [makeApp({ company: "Acme", position: "Engineer", status: "applied" })];

    const plan = planImportWrites(existing, imported, { allowStatusProgression: true });

    expect(plan.changedRecords).toHaveLength(1);
    expect(plan.changedRecords[0].status).toBe("applied");
  });

  const PLACEHOLDER = "Software Engineer / General Application";

  it("matches a placeholder-position row to an existing row by company alone", () => {
    const existing = [
      makeApp({ company: "Acme", position: "Backend Engineer", location: null }),
    ];
    const imported = [makeApp({ company: "Acme", position: PLACEHOLDER, location: "Remote" })];

    const plan = planImportWrites(existing, imported, { placeholderPosition: PLACEHOLDER });

    expect(plan.newRecords).toEqual([]);
    expect(plan.changedRecords).toHaveLength(1);
    expect(plan.changedRecords[0].position).toBe("Backend Engineer"); // real title preserved
    expect(plan.changedRecords[0].location).toBe("Remote"); // blank field still filled
  });

  it("does not fall back to company-only matching without placeholderPosition set", () => {
    const existing = [makeApp({ company: "Acme", position: "Backend Engineer" })];
    const imported = [makeApp({ company: "Acme", position: PLACEHOLDER })];

    // No placeholderPosition option passed — PLACEHOLDER is just an ordinary string,
    // doesn't match "Backend Engineer", so this creates a second row like any
    // genuinely different position would.
    const plan = planImportWrites(existing, imported);

    expect(plan.newRecords).toHaveLength(1);
    expect(plan.changedRecords).toEqual([]);
  });

  it("creates a new row when no existing row exists for that company at all", () => {
    const existing = [makeApp({ company: "Globex", position: "Designer" })];
    const imported = [makeApp({ company: "Acme", position: PLACEHOLDER })];

    const plan = planImportWrites(existing, imported, { placeholderPosition: PLACEHOLDER });

    expect(plan.newRecords).toHaveLength(1);
    expect(plan.newRecords[0].company).toBe("Acme");
    expect(plan.changedRecords).toEqual([]);
  });

  it("never lets a placeholder position overwrite a real one already on the row", () => {
    const existing = [makeApp({ company: "Acme", position: "Staff Engineer" })];
    const imported = [makeApp({ company: "Acme", position: PLACEHOLDER })];

    planImportWrites(existing, imported, { placeholderPosition: PLACEHOLDER });

    expect(existing[0].position).toBe("Staff Engineer");
  });
});
