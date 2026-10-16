import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./format-relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("returns 'Just now' for timestamps under a minute old", () => {
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatRelativeTime(thirtySecondsAgo, now)).toBe("Just now");
  });

  it("formats minutes", () => {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo, now)).toBe("5m ago");
  });

  it("formats hours", () => {
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo, now)).toBe("3h ago");
  });

  it("formats days", () => {
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoDaysAgo, now)).toBe("2d ago");
  });

  it("formats weeks", () => {
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoWeeksAgo, now)).toBe("2w ago");
  });

  it("formats months once past the weeks threshold", () => {
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoMonthsAgo, now)).toBe("2mo ago");
  });
});
