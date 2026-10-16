import { describe, expect, it } from "vitest";
import { shouldProcessEmail } from "./email-filter";

describe("shouldProcessEmail", () => {
  it("accepts a real application confirmation email", () => {
    expect(
      shouldProcessEmail({
        subject: "We received your application",
        from: "recruiting@acme.com",
        snippet: "Thank you for applying to the Software Engineer role...",
      })
    ).toBe(true);
  });

  it("accepts an interview invite", () => {
    expect(
      shouldProcessEmail({
        subject: "Let's schedule your interview",
        from: "hr@globex.com",
        snippet: "We'd like to invite you to an interview for the Designer position.",
      })
    ).toBe(true);
  });

  it("accepts a rejection email", () => {
    expect(
      shouldProcessEmail({
        subject: "Update on your application",
        from: "noreply@globex.com",
        snippet: "After careful consideration, we have decided to move forward with other candidates.",
      })
    ).toBe(true);
  });

  it("rejects a LinkedIn job-alert digest even though it mentions 'interview'", () => {
    expect(
      shouldProcessEmail({
        subject: "5 new jobs for you, including an Interview Coach role",
        from: "jobalerts-noreply@linkedin.com",
        snippet: "New jobs matching your search: Software Engineer, Interview Coach...",
      })
    ).toBe(false);
  });

  it("rejects a generic newsletter", () => {
    expect(
      shouldProcessEmail({
        subject: "This week in tech",
        from: "newsletter@techcrunch.com",
        snippet: "Top stories in AI, startups, and venture capital this week.",
      })
    ).toBe(false);
  });

  it("rejects an unrelated email with no matching keywords", () => {
    expect(
      shouldProcessEmail({
        subject: "Your receipt from Coffee Shop",
        from: "receipts@coffeeshop.com",
        snippet: "Thanks for your order! Total: $4.50",
      })
    ).toBe(false);
  });

  it("excluded-sender check wins even when the subject has a strong keyword match", () => {
    expect(
      shouldProcessEmail({
        subject: "Interview tips: how to ace your next interview",
        from: "digest@careersite.com",
        snippet: "Our weekly digest of interview advice and application tips.",
      })
    ).toBe(false);
  });

  it("is case-insensitive on both sender and content checks", () => {
    expect(
      shouldProcessEmail({
        subject: "APPLICATION RECEIVED",
        from: "Recruiting@ACME.com",
        snippet: "",
      })
    ).toBe(true);
  });

  // Real-world ATS phrasing varies a lot — these are regressions for subjects that
  // broke the old exact-substring matcher (e.g. "application ... has been received"
  // never contains the literal substring "application received").
  it("accepts 'Your application to <Company> has been received' phrasing", () => {
    expect(
      shouldProcessEmail({
        subject: "Your application to M3USA has been received",
        from: "no-reply@m3usa.com",
        snippet: "Thank you for applying for the Forward Deployed Engineer position at M3USA.",
      })
    ).toBe(true);
  });

  it("accepts a bare 'Your application for <role>' subject with no confirmation word", () => {
    expect(
      shouldProcessEmail({
        subject: "Your application for Margin - Software Engineer (new grad)",
        from: "Y Combinator <workatastartup@ycombinator.com>",
        snippet: "",
      })
    ).toBe(true);
  });

  it("accepts 'Thank you for your interest in <Company>' phrasing", () => {
    expect(
      shouldProcessEmail({
        subject: "Thank you for your interest in M3USA",
        from: "no-reply@m3usa.com",
        snippet: "We appreciate you taking the time to apply.",
      })
    ).toBe(true);
  });

  it("accepts any email from a known ATS domain regardless of wording", () => {
    expect(
      shouldProcessEmail({
        subject: "A quick note",
        from: "notifications@greenhouse.io",
        snippet: "Nothing matching the usual keywords here at all.",
      })
    ).toBe(true);
  });

  it("accepts an ATS email from a subdomain (e.g. mail.lever.co)", () => {
    expect(
      shouldProcessEmail({
        subject: "A quick note",
        from: "notifications@mail.lever.co",
        snippet: "Nothing matching the usual keywords here at all.",
      })
    ).toBe(true);
  });

  it("rejects a 'recommended jobs' digest even from a trusted ATS domain", () => {
    expect(
      shouldProcessEmail({
        subject: "New jobs for you this week",
        from: "notifications@greenhouse.io",
        snippet: "Recommended jobs based on your profile.",
      })
    ).toBe(false);
  });

  it("rejects a job-alert digest even when it contains 'application'", () => {
    expect(
      shouldProcessEmail({
        subject: "5 new jobs matching your search",
        from: "updates@somejobsboard.com",
        snippet: "Jobs matching your search: submit your application today.",
      })
    ).toBe(false);
  });
});
