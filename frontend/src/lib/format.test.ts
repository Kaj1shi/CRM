import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatKg } from "./format";

describe("format", () => {
  it("formats Kampala dates and kilogram totals", () => {
    expect(formatDate("2026-09-28T00:00:00.000Z")).toBe("28 Sep 2026");
    expect(formatKg(42500)).toBe("42.5 tonnes");
    expect(formatKg(500)).toBe("500 kg");
    expect(formatKg(null)).toBe("—");
  });

  it("formats Kampala date-times for audit logs", () => {
    // 18:45:03 UTC → 21:45:03 in Africa/Kampala (UTC+3)
    expect(formatDateTime("2026-09-28T18:45:03.000Z")).toBe("28 Sep 2026, 21:45:03");
    expect(formatDateTime(null)).toBe("—");
  });
});
