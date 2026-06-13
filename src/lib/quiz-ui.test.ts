import { describe, it, expect } from "vitest";
import { coerceTimeLimit, formatPercent, formatTimer } from "./quiz-ui";

describe("coerceTimeLimit", () => {
  it("returns null for empty string", () => {
    expect(coerceTimeLimit("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(coerceTimeLimit("   ")).toBeNull();
  });

  it("returns 300 for '300'", () => {
    expect(coerceTimeLimit("300")).toBe(300);
  });

  it("passes through 0 for Zod to reject", () => {
    expect(coerceTimeLimit("0")).toBe(0);
  });

  it("passes through 1.5 for Zod to reject", () => {
    expect(coerceTimeLimit("1.5")).toBe(1.5);
  });

  it("passes through NaN for Zod to reject (non-numeric string)", () => {
    expect(coerceTimeLimit("abc")).toBeNaN();
  });
});

describe("formatPercent", () => {
  it("returns '—' for null", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("returns '0%' for 0", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("returns '76%' for 0.756", () => {
    expect(formatPercent(0.756)).toBe("76%");
  });

  it("returns '100%' for 1", () => {
    expect(formatPercent(1)).toBe("100%");
  });
});

describe("formatTimer", () => {
  it("returns '0:00' for 0", () => {
    expect(formatTimer(0)).toBe("0:00");
  });

  it("returns '0:05' for 5", () => {
    expect(formatTimer(5)).toBe("0:05");
  });

  it("returns '1:05' for 65", () => {
    expect(formatTimer(65)).toBe("1:05");
  });

  it("returns '10:00' for 600", () => {
    expect(formatTimer(600)).toBe("10:00");
  });
});
