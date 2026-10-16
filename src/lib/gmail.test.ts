import { afterEach, describe, expect, it, vi } from "vitest";
import { formatChicagoDateForGmailQuery, fetchGmailCandidates } from "./gmail";

vi.mock("googleapis", () => {
  const mockGmail = {
    users: {
      history: { list: vi.fn() },
      messages: { list: vi.fn(), get: vi.fn() },
      getProfile: vi.fn(),
    },
  };
  return {
    google: {
      auth: { OAuth2: vi.fn().mockImplementation(function () { return { setCredentials: vi.fn() }; }) },
      gmail: vi.fn(() => mockGmail),
    },
    __mockGmail: mockGmail,
  };
});

describe("formatChicagoDateForGmailQuery", () => {
  it("formats a winter date (CST, UTC-6) correctly", () => {
    // 2026-01-15 06:00 UTC is 2026-01-15 00:00 in Chicago (CST) -- same calendar day.
    const date = new Date("2026-01-15T06:00:00Z");
    expect(formatChicagoDateForGmailQuery(date)).toBe("2026/01/15");
  });

  it("formats a summer date (CDT, UTC-5) correctly", () => {
    // 2026-07-04 04:00 UTC is 2026-07-03 23:00 in Chicago (CDT) -- previous calendar day.
    const date = new Date("2026-07-04T04:00:00Z");
    expect(formatChicagoDateForGmailQuery(date)).toBe("2026/07/03");
  });

  it("pads single-digit months and days with a leading zero", () => {
    const date = new Date("2026-03-05T18:00:00Z");
    expect(formatChicagoDateForGmailQuery(date)).toBe("2026/03/05");
  });
});

describe("fetchGmailCandidates query selection", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses a signup-date-bounded query when there is no stored historyId", async () => {
    const { __mockGmail } = (await import("googleapis")) as unknown as {
      __mockGmail: {
        users: {
          messages: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
          getProfile: ReturnType<typeof vi.fn>;
          history: { list: ReturnType<typeof vi.fn> };
        };
      };
    };

    __mockGmail.users.messages.list.mockResolvedValue({ data: { messages: [] } });
    __mockGmail.users.getProfile.mockResolvedValue({ data: { historyId: "999" } });

    const signupDate = new Date("2026-01-15T06:00:00Z");
    await fetchGmailCandidates("fake-token", null, signupDate);

    expect(__mockGmail.users.history.list).not.toHaveBeenCalled();
    expect(__mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining("after:2026/01/15") })
    );
  });

  it("uses history.list when a historyId cursor exists, without touching messages.list", async () => {
    const { __mockGmail } = (await import("googleapis")) as unknown as {
      __mockGmail: {
        users: {
          messages: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
          getProfile: ReturnType<typeof vi.fn>;
          history: { list: ReturnType<typeof vi.fn> };
        };
      };
    };

    __mockGmail.users.history.list.mockResolvedValue({
      data: { history: [], historyId: "1000" },
    });

    const signupDate = new Date("2026-01-15T06:00:00Z");
    const result = await fetchGmailCandidates("fake-token", "500", signupDate);

    expect(__mockGmail.users.history.list).toHaveBeenCalledWith(
      expect.objectContaining({ startHistoryId: "500" })
    );
    expect(__mockGmail.users.messages.list).not.toHaveBeenCalled();
    expect(result.historyId).toBe("1000");
  });

  it("falls back to the bounded query when startHistoryId has expired", async () => {
    const { __mockGmail } = (await import("googleapis")) as unknown as {
      __mockGmail: {
        users: {
          messages: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
          getProfile: ReturnType<typeof vi.fn>;
          history: { list: ReturnType<typeof vi.fn> };
        };
      };
    };

    __mockGmail.users.history.list.mockRejectedValue(new Error("404: startHistoryId expired"));
    __mockGmail.users.messages.list.mockResolvedValue({ data: { messages: [] } });
    __mockGmail.users.getProfile.mockResolvedValue({ data: { historyId: "2000" } });

    const signupDate = new Date("2026-01-15T06:00:00Z");
    await fetchGmailCandidates("fake-token", "expired-id", signupDate);

    expect(__mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining("after:2026/01/15") })
    );
  });
});
