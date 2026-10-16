import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPrivateIp,
  extractJobPostings,
  formatSalary,
  formatLocation,
  enrichJobData,
  extractAtsUrlFromBody,
  extractPositionFromSubject,
  GENERIC_POSITION_PLACEHOLDER,
} from "./email-parser";

describe("isPrivateIp", () => {
  it.each([
    ["127.0.0.1", true],
    ["10.0.0.5", true],
    ["172.16.0.1", true],
    ["172.31.255.255", true],
    ["192.168.1.1", true],
    ["169.254.169.254", true], // cloud metadata endpoint
    ["0.0.0.0", true],
    ["100.64.0.1", true],
    ["8.8.8.8", false],
    ["93.184.216.34", false],
    ["172.32.0.1", false], // just outside the 172.16/12 private range
  ])("classifies IPv4 %s as private=%s", (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected);
  });

  it.each([
    ["::1", true],
    ["fe80::1", true],
    ["fc00::1", true],
    ["fd12:3456::1", true],
    ["2001:4860:4860::8888", false],
  ])("classifies IPv6 %s as private=%s", (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected);
  });

  it("treats a malformed IPv4-looking string as unsafe", () => {
    expect(isPrivateIp("not.an.ip.address")).toBe(true);
  });
});

describe("extractJobPostings", () => {
  it("finds a top-level JobPosting object", () => {
    const html = `<script type="application/ld+json">{"@type":"JobPosting","title":"Engineer"}</script>`;
    const postings = extractJobPostings(html);
    expect(postings).toHaveLength(1);
    expect(postings[0].title).toBe("Engineer");
  });

  it("finds a JobPosting inside a @graph array", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":"JobPosting","title":"Designer"}]}</script>`;
    const postings = extractJobPostings(html);
    expect(postings).toHaveLength(1);
    expect(postings[0].title).toBe("Designer");
  });

  it("finds a JobPosting inside a top-level array", () => {
    const html = `<script type="application/ld+json">[{"@type":"JobPosting","title":"PM"}]</script>`;
    const postings = extractJobPostings(html);
    expect(postings).toHaveLength(1);
  });

  it("unescapes HTML entities before parsing, as some job boards encode the payload", () => {
    // The raw payload is: {"@type":"JobPosting","title":"Front-End <Engineer> & Lead"}
    // but HTML-entity-encoded, which would be a JSON syntax error without unescaping.
    const html =
      `<script type="application/ld+json">` +
      `{&quot;@type&quot;:&quot;JobPosting&quot;,&quot;title&quot;:&quot;Front-End &lt;Engineer&gt; &amp; Lead&quot;}` +
      `</script>`;

    expect(() => JSON.parse(html.match(/>(.*)</)![1])).toThrow(); // sanity: raw payload really is invalid JSON

    const postings = extractJobPostings(html);
    expect(postings).toHaveLength(1);
    expect(postings[0].title).toBe("Front-End <Engineer> & Lead");
  });

  it("ignores a malformed JSON-LD block instead of throwing", () => {
    const html = `<script type="application/ld+json">{not valid json</script>`;
    expect(() => extractJobPostings(html)).not.toThrow();
    expect(extractJobPostings(html)).toEqual([]);
  });

  it("returns an empty array when no JobPosting is present", () => {
    const html = `<script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>`;
    expect(extractJobPostings(html)).toEqual([]);
  });

  it("recovers one valid JobPosting even when a sibling script block is malformed", () => {
    const html = `
      <script type="application/ld+json">{broken</script>
      <script type="application/ld+json">{"@type":"JobPosting","title":"QA"}</script>
    `;
    const postings = extractJobPostings(html);
    expect(postings).toHaveLength(1);
    expect(postings[0].title).toBe("QA");
  });
});

describe("formatSalary", () => {
  it("formats a single flat value", () => {
    const result = formatSalary({
      baseSalary: { currency: "USD", value: { value: 120000, unitText: "YEAR" } },
    });
    expect(result).toBe("$120,000/year");
  });

  it("formats a min/max range", () => {
    const result = formatSalary({
      baseSalary: { currency: "USD", value: { minValue: 120000, maxValue: 150000, unitText: "YEAR" } },
    });
    expect(result).toBe("$120,000–$150,000/year");
  });

  it("defaults to USD when currency is missing", () => {
    const result = formatSalary({ baseSalary: { value: { value: 50000 } } });
    expect(result).toBe("$50,000");
  });

  it("returns null when baseSalary is absent", () => {
    expect(formatSalary({ title: "Engineer" })).toBeNull();
  });

  it("returns null when value has neither a flat value nor a min/max range", () => {
    expect(formatSalary({ baseSalary: { currency: "USD", value: {} } })).toBeNull();
  });
});

describe("formatLocation", () => {
  it("formats locality and region", () => {
    const result = formatLocation({
      jobLocation: { address: { addressLocality: "Austin", addressRegion: "TX" } },
    });
    expect(result).toBe("Austin, TX");
  });

  it("falls back to country when locality/region are absent", () => {
    const result = formatLocation({ jobLocation: { address: { addressCountry: "Canada" } } });
    expect(result).toBe("Canada");
  });

  it("takes the first entry when jobLocation is an array", () => {
    const result = formatLocation({
      jobLocation: [{ address: { addressLocality: "Remote" } }, { address: { addressLocality: "Austin" } }],
    });
    expect(result).toBe("Remote");
  });

  it("returns null when there is no address at all", () => {
    expect(formatLocation({ jobLocation: {} })).toBeNull();
  });

  it("returns null when jobLocation is absent entirely", () => {
    expect(formatLocation({ title: "Engineer" })).toBeNull();
  });
});

describe("enrichJobData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null fields for a non-URL input instead of throwing", async () => {
    await expect(enrichJobData("not a url")).resolves.toEqual({ salary: null, location: null });
  });

  it("returns null fields when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    await expect(enrichJobData("https://example.com/jobs/1")).resolves.toEqual({
      salary: null,
      location: null,
    });
  });

  it("returns null fields on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, headers: new Headers(), text: async () => "" })
    );
    await expect(enrichJobData("https://example.com/jobs/1")).resolves.toEqual({
      salary: null,
      location: null,
    });
  });

  it("extracts salary and location from a real JSON-LD response", async () => {
    const html = `<html><script type="application/ld+json">${JSON.stringify({
      "@type": "JobPosting",
      baseSalary: { currency: "USD", value: { minValue: 100000, maxValue: 130000, unitText: "YEAR" } },
      jobLocation: { address: { addressLocality: "Austin", addressRegion: "TX" } },
    })}</script></html>`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-length": String(html.length) }),
        text: async () => html,
      })
    );

    await expect(enrichJobData("https://example.com/jobs/1")).resolves.toEqual({
      salary: "$100,000–$130,000/year",
      location: "Austin, TX",
    });
  });
});

describe("extractAtsUrlFromBody", () => {
  it("finds a Greenhouse URL embedded in raw HTML markup", () => {
    const body = `View your application: <a href="https://boards.greenhouse.io/acme/jobs/12345">View</a>`;
    expect(extractAtsUrlFromBody(body)).toBe("https://boards.greenhouse.io/acme/jobs/12345");
  });

  it("finds a Lever URL and strips trailing sentence punctuation", () => {
    const body = "Apply here: https://jobs.lever.co/acme/abc123.";
    expect(extractAtsUrlFromBody(body)).toBe("https://jobs.lever.co/acme/abc123");
  });

  it("finds a URL on an ATS subdomain (e.g. boards.greenhouse.io)", () => {
    const body = "https://boards.greenhouse.io/acme/jobs/999";
    expect(extractAtsUrlFromBody(body)).toBe("https://boards.greenhouse.io/acme/jobs/999");
  });

  it("ignores non-ATS links like an unsubscribe URL", () => {
    const body = "Unsubscribe at https://example.com/unsub";
    expect(extractAtsUrlFromBody(body)).toBeNull();
  });

  it("skips a non-ATS link and still finds the ATS one later in the body", () => {
    const body =
      "Logo: https://example.com/logo.png View posting: https://jobs.smartrecruiters.com/Acme/987";
    expect(extractAtsUrlFromBody(body)).toBe("https://jobs.smartrecruiters.com/Acme/987");
  });

  it("returns null for a body with no URLs at all", () => {
    expect(extractAtsUrlFromBody("Thank you for applying.")).toBeNull();
  });
});

describe("extractPositionFromSubject", () => {
  it("extracts the title after a dash in 'application for <Company> - <Title>'", () => {
    expect(
      extractPositionFromSubject("Your application for Margin - Software Engineer (new grad)")
    ).toBe("Software Engineer (new grad)");
  });

  it("extracts the title after 'for' in 'application to <Company> for <Title>'", () => {
    expect(
      extractPositionFromSubject("Your application to Acme for Staff Engineer has been received")
    ).toBe("Staff Engineer");
  });

  it("extracts the title between 'applying to' and 'at' in 'applying to <Title> at <Company>'", () => {
    expect(
      extractPositionFromSubject("Thank you for applying to Senior Backend Engineer at Stripe")
    ).toBe("Senior Backend Engineer");
  });

  it("returns null when the subject names only a company, no title", () => {
    expect(extractPositionFromSubject("Thank you for applying to Authentic")).toBeNull();
    expect(extractPositionFromSubject("Your application to M3USA has been received")).toBeNull();
  });

  it("returns null for a subject with no recognizable pattern at all", () => {
    expect(extractPositionFromSubject("Update on your status")).toBeNull();
  });
});

describe("GENERIC_POSITION_PLACEHOLDER", () => {
  it("is a short, non-empty, human-readable placeholder", () => {
    expect(GENERIC_POSITION_PLACEHOLDER.length).toBeGreaterThan(0);
    expect(GENERIC_POSITION_PLACEHOLDER.length).toBeLessThan(100);
  });
});
