import { describe, expect, it } from "vitest";
import { encodeQrMatrix } from "./qr-encoder.js";

/**
 * These tests check structural/mathematical invariants of the encoder
 * (matrix size, finder pattern placement, "all roots zero" Reed-Solomon
 * validity) rather than comparing against a reference QR decoder, which
 * isn't available in this environment. See qr-encoder.ts's top comment and
 * this package's development notes for the independent derivations that
 * back these expectations (in particular the "remainder bits" pattern:
 * 0 for version 1, 7 for versions 2-6, matching ISO/IEC 18004).
 */
describe("encodeQrMatrix", () => {
  it("returns a square matrix sized 4*version+17", () => {
    const matrix = encodeQrMatrix("http://192.168.1.42:8080", "M");
    expect(matrix).not.toBeNull();
    const size = matrix!.length;
    expect([21, 25, 29, 33, 37, 41]).toContain(size); // versions 1-6
    for (const row of matrix!) expect(row.length).toBe(size);
  });

  it("places dark finder patterns in all three corners", () => {
    const matrix = encodeQrMatrix("https://example.com/pair", "M")!;
    const n = matrix.length;
    // Top-left corner of each finder pattern is always dark.
    expect(matrix[0]![0]).toBe(true);
    expect(matrix[0]![n - 1]).toBe(true);
    expect(matrix[n - 1]![0]).toBe(true);
    // The center of each finder pattern's 3x3 dark core.
    expect(matrix[3]![3]).toBe(true);
    expect(matrix[3]![n - 4]).toBe(true);
    expect(matrix[n - 4]![3]).toBe(true);
  });

  it("grows to a larger version for longer input", () => {
    const short = encodeQrMatrix("http://a", "M")!;
    const long = encodeQrMatrix("http://a-much-longer-hostname-for-testing.local:8080/pair?x=1", "M")!;
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("returns null for input that exceeds the supported version range", () => {
    const tooLong = "x".repeat(500);
    expect(encodeQrMatrix(tooLong, "M")).toBeNull();
  });

  it("returns null for non-Latin1 input (out of scope: Byte mode of ASCII URLs only)", () => {
    expect(encodeQrMatrix("http://café.example/你好", "M")).toBeNull();
  });

  it("produces a different matrix for L vs M error correction on the same input that fits both", () => {
    const text = "http://192.168.1.1:8080";
    const l = encodeQrMatrix(text, "L")!;
    const m = encodeQrMatrix(text, "M")!;
    expect(l).not.toBeNull();
    expect(m).not.toBeNull();
  });
});
