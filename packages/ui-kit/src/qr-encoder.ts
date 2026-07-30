/**
 * Self-contained QR code encoder — Byte mode only, versions 1-6, error
 * correction levels L and M. No network calls and no external dependency
 * (npm registry access is unavailable in some deployment/build
 * environments for this project, and — more importantly — a pairing URL
 * should never leave the device as a request to a third-party "QR image"
 * service, which is what most zero-dependency shortcuts would otherwise
 * require).
 *
 * Scope is intentionally narrow: this only needs to encode short ASCII
 * URLs (e.g. "http://192.168.1.42:8080"), so versions beyond 6 (and the
 * more irregular multi-block-size structures QR uses for higher
 * versions/levels) are out of scope. `encodeQrMatrix` returns `null`
 * if the input doesn't fit — callers should fall back to a plain
 * copy/open link in that case (see QrCode.tsx).
 *
 * Implements ISO/IEC 18004 faithfully for the subset above: Reed-Solomon
 * error correction over GF(256), the standard finder/timing/alignment
 * pattern layout, BCH-encoded format information, and mask-pattern
 * selection via the four standard penalty rules.
 */

export type EcLevel = "L" | "M";

const EC_LEVEL_BITS: Record<EcLevel, number> = { M: 0b00, L: 0b01 };

// [eccCodewordsPerBlock, numBlocks, totalCodewords] for versions 1-6, L and M.
// All blocks are equal-sized at these (version, level) pairs — no mixed
// short/long block groups, which only start appearing at higher
// versions/levels that are out of scope here.
const RS_TABLE: Record<number, Record<EcLevel, { ecc: number; blocks: number }> & { total: number }> = {
  1: { L: { ecc: 7, blocks: 1 }, M: { ecc: 10, blocks: 1 }, total: 26 },
  2: { L: { ecc: 10, blocks: 1 }, M: { ecc: 16, blocks: 1 }, total: 44 },
  3: { L: { ecc: 15, blocks: 1 }, M: { ecc: 26, blocks: 1 }, total: 70 },
  4: { L: { ecc: 20, blocks: 1 }, M: { ecc: 18, blocks: 2 }, total: 100 },
  5: { L: { ecc: 26, blocks: 1 }, M: { ecc: 24, blocks: 2 }, total: 134 },
  6: { L: { ecc: 18, blocks: 2 }, M: { ecc: 16, blocks: 4 }, total: 172 },
};

// Center coordinate of the single non-finder alignment pattern for
// versions 2-6 (versions beyond 6 need more than one, out of scope).
const ALIGNMENT_CENTER: Record<number, number | null> = { 1: null, 2: 18, 3: 22, 4: 26, 5: 30, 6: 34 };

/* ---------------------------- GF(256) math ---------------------------- */

const GF_EXP = new Array<number>(512);
const GF_LOG = new Array<number>(256);
(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]!;
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

/** Reed-Solomon generator polynomial of the given degree, coefficients highest-order first. */
function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j]!, 1);
      next[j + 1] ^= gfMul(poly[j]!, GF_EXP[i]!);
    }
    poly = next;
  }
  return poly;
}

/** Computes the `eccCount` Reed-Solomon error-correction codewords for one data block. */
function rsEncodeBlock(data: number[], eccCount: number): number[] {
  const generator = rsGeneratorPoly(eccCount);
  const remainder = [...data, ...new Array(eccCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const factor = remainder[i]!;
    if (factor === 0) continue;
    for (let j = 0; j < generator.length; j++) {
      remainder[i + j] ^= gfMul(generator[j]!, factor);
    }
  }
  return remainder.slice(data.length);
}

/* ------------------------------ Bit buffer ----------------------------- */

class BitBuffer {
  bits: number[] = [];
  put(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length(): number {
    return this.bits.length;
  }
}

/* --------------------------- Data codeword build ------------------------ */

function bytesForVersionLevel(version: number, level: EcLevel): number {
  const table = RS_TABLE[version]!;
  const info = table[level];
  return table.total - info.ecc * info.blocks;
}

function buildDataCodewords(text: string, version: number, level: EcLevel): number[] | null {
  const dataCapacityBytes = bytesForVersionLevel(version, level);
  const bytes = Array.from(text, (ch) => ch.codePointAt(0) ?? 0x3f).filter((code) => code <= 0xff);
  if (bytes.length !== text.length) return null; // non-Latin1 input: caller should pick a smaller/simpler string

  const buffer = new BitBuffer();
  buffer.put(0b0100, 4); // Byte mode indicator
  buffer.put(bytes.length, 8); // char count indicator (8 bits: versions 1-9)
  for (const b of bytes) buffer.put(b, 8);

  const capacityBits = dataCapacityBytes * 8;
  if (buffer.length > capacityBits) return null;

  // Terminator (up to 4 bits) + pad to a byte boundary.
  buffer.put(0, Math.min(4, capacityBits - buffer.length));
  while (buffer.length % 8 !== 0) buffer.bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < buffer.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | buffer.bits[i + j]!;
    codewords.push(byte);
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < dataCapacityBytes) {
    codewords.push(padBytes[padIndex % 2]!);
    padIndex++;
  }
  return codewords;
}

function interleave(version: number, level: EcLevel, dataCodewords: number[]): number[] {
  const info = RS_TABLE[version]![level];
  const blockCount = info.blocks;
  const blockDataLen = dataCodewords.length / blockCount;

  const dataBlocks: number[][] = [];
  const eccBlocks: number[][] = [];
  for (let b = 0; b < blockCount; b++) {
    const block = dataCodewords.slice(b * blockDataLen, (b + 1) * blockDataLen);
    dataBlocks.push(block);
    eccBlocks.push(rsEncodeBlock(block, info.ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blockDataLen; i++) {
    for (const block of dataBlocks) result.push(block[i]!);
  }
  for (let i = 0; i < info.ecc; i++) {
    for (const block of eccBlocks) result.push(block[i]!);
  }
  return result;
}

/* ------------------------------ Format info ----------------------------- */

function formatInfoBits(level: EcLevel, maskPattern: number): number[] {
  const data = (EC_LEVEL_BITS[level] << 3) | maskPattern; // 5 bits
  let d = data << 10;
  const generator = 0b10100110111; // G(x) for format info, degree 10
  for (let i = 4; i >= 0; i--) {
    if ((d >> (i + 10)) & 1) d ^= generator << i;
  }
  const combined = ((data << 10) | d) ^ 0b101010000010010;
  const bits: number[] = [];
  for (let i = 14; i >= 0; i--) bits.push((combined >>> i) & 1);
  return bits;
}

/* -------------------------------- Matrix -------------------------------- */

type Matrix = { size: number; modules: (boolean | null)[][]; reserved: boolean[][] };

function createMatrix(version: number): Matrix {
  const size = version * 4 + 17;
  return {
    size,
    modules: Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null)),
    reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
  };
}

function setModule(m: Matrix, row: number, col: number, dark: boolean, reserve = true): void {
  m.modules[row]![col] = dark;
  if (reserve) m.reserved[row]![col] = true;
}

function placeFinderPattern(m: Matrix, row: number, col: number): void {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= m.size || cc >= m.size) continue;
      const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
      const inRing = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      const dark = !isBorder && (inRing || inCore);
      setModule(m, rr, cc, dark);
    }
  }
}

function placeAlignmentPattern(m: Matrix, centerRow: number, centerCol: number): void {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const ring = Math.max(Math.abs(r), Math.abs(c));
      setModule(m, centerRow + r, centerCol + c, ring !== 1);
    }
  }
}

function placeTimingPatterns(m: Matrix): void {
  for (let i = 8; i < m.size - 8; i++) {
    setModule(m, 6, i, i % 2 === 0);
    setModule(m, i, 6, i % 2 === 0);
  }
}

/**
 * Reserves the two format-info regions (15 modules each, near the
 * top-left finder and split across the top-right/bottom-left finders)
 * plus the always-dark module. Verified against an independent
 * cell-by-cell derivation of ISO/IEC 18004's format-info layout — see
 * the reasoning trail in this package's development notes; a `reserved`
 * count of 233 for version 1 and 266 for version 2 (both cross-checked
 * by hand) confirmed this placement, with the version-2-6 "7 remainder
 * bits" (unused trailing modules, spec-mandated to read as 0/light)
 * falling out for free from `placeDataBits`'s bounds-checked fallback.
 */
function reserveFormatAreas(m: Matrix): void {
  for (let i = 0; i <= 8; i++) {
    m.reserved[8]![i] = true;
    m.reserved[i]![8] = true;
  }
  for (let i = 0; i < 8; i++) {
    m.reserved[8]![m.size - 1 - i] = true;
    m.reserved[m.size - 1 - i]![8] = true;
  }
}

function placeFormatInfo(m: Matrix, level: EcLevel, mask: number): void {
  const bits = formatInfoBits(level, mask);
  // Copy A, near the top-left finder pattern (column 8 then row 8,
  // skipping row/col 6 which belong to the timing patterns).
  for (let i = 0; i <= 5; i++) setModule(m, i, 8, bits[i] === 1);
  setModule(m, 7, 8, bits[6] === 1);
  setModule(m, 8, 8, bits[7] === 1);
  setModule(m, 8, 7, bits[8] === 1);
  for (let i = 9; i <= 14; i++) setModule(m, 8, 14 - i, bits[i] === 1);
  // Copy B, split across the bottom-left (column 8) and top-right (row 8) finders.
  for (let i = 0; i < 7; i++) setModule(m, m.size - 1 - i, 8, bits[i] === 1);
  for (let i = 7; i < 15; i++) setModule(m, 8, m.size - 15 + i, bits[i] === 1);
  // The always-dark module (fixed, not one of the 15 format bits).
  setModule(m, m.size - 8, 8, true);
}

function placeDataBits(m: Matrix, codewords: number[], mask: number): void {
  const bits: number[] = [];
  for (const byte of codewords) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);

  let bitIndex = 0;
  let upward = true;
  for (let colPair = m.size - 1; colPair > 0; colPair -= 2) {
    const col = colPair === 6 ? 5 : colPair; // skip the vertical timing column
    for (let i = 0; i < m.size; i++) {
      const row = upward ? m.size - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (m.reserved[row]![c]) continue;
        const bit = bitIndex < bits.length ? bits[bitIndex]! : 0;
        bitIndex++;
        const masked = applyMask(mask, row, c) ? bit ^ 1 : bit;
        m.modules[row]![c] = masked === 1;
      }
    }
    upward = !upward;
  }
}

function applyMask(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function maskPenalty(m: Matrix): number {
  const n = m.size;
  const get = (r: number, c: number) => m.modules[r]![c] === true;
  let penalty = 0;

  // Rule 1: 5+ same-color modules in a row/column.
  for (let r = 0; r < n; r++) {
    let run = 1;
    for (let c = 1; c < n; c++) {
      if (get(r, c) === get(r, c - 1)) run++;
      else run = 1;
      if (run === 5) penalty += 3;
      else if (run > 5) penalty += 1;
    }
  }
  for (let c = 0; c < n; c++) {
    let run = 1;
    for (let r = 1; r < n; r++) {
      if (get(r, c) === get(r - 1, c)) run++;
      else run = 1;
      if (run === 5) penalty += 3;
      else if (run > 5) penalty += 1;
    }
  }

  // Rule 2: 2x2 blocks of the same color.
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = get(r, c);
      if (v === get(r, c + 1) && v === get(r + 1, c) && v === get(r + 1, c + 1)) penalty += 3;
    }
  }

  // Rule 3: 1:1:3:1:1 patterns with 4 light modules before/after.
  const pattern = [true, false, true, true, true, false, true];
  const matchesAt = (bits: boolean[], start: number) => pattern.every((p, i) => bits[start + i] === p);
  for (let r = 0; r < n; r++) {
    const rowBits = Array.from({ length: n }, (_, c) => get(r, c));
    for (let c = 0; c + 11 <= n; c++) {
      if (matchesAt(rowBits, c + 4) && rowBits.slice(c, c + 4).every((b) => !b)) penalty += 40;
    }
  }
  for (let c = 0; c < n; c++) {
    const colBits = Array.from({ length: n }, (_, r) => get(r, c));
    for (let r = 0; r + 11 <= n; r++) {
      if (matchesAt(colBits, r + 4) && colBits.slice(r, r + 4).every((b) => !b)) penalty += 40;
    }
  }

  // Rule 4: overall dark/light balance.
  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (get(r, c)) dark++;
  const ratio = (dark * 100) / (n * n);
  penalty += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return penalty;
}

/**
 * Encodes `text` as a QR code. Returns the boolean module matrix (true =
 * dark), or `null` if the text doesn't fit in the supported version/EC
 * range (versions 1-6) — callers should fall back to a plain link.
 */
export function encodeQrMatrix(text: string, level: EcLevel = "M"): boolean[][] | null {
  let version = 0;
  let dataCodewords: number[] | null = null;
  for (let v = 1; v <= 6; v++) {
    const attempt = buildDataCodewords(text, v, level);
    if (attempt) {
      version = v;
      dataCodewords = attempt;
      break;
    }
  }
  if (!version || !dataCodewords) return null;

  const finalCodewords = interleave(version, level, dataCodewords);

  let best: { mask: number; matrix: Matrix; penalty: number } | null = null;
  for (let mask = 0; mask < 8; mask++) {
    const m = createMatrix(version);
    placeFinderPattern(m, 0, 0);
    placeFinderPattern(m, 0, m.size - 7);
    placeFinderPattern(m, m.size - 7, 0);
    const alignmentCenter = ALIGNMENT_CENTER[version];
    if (alignmentCenter) placeAlignmentPattern(m, alignmentCenter, alignmentCenter);
    placeTimingPatterns(m);
    reserveFormatAreas(m);
    setModule(m, m.size - 8, 8, true);
    placeDataBits(m, finalCodewords, mask);
    placeFormatInfo(m, level, mask);

    const penalty = maskPenalty(m);
    if (!best || penalty < best.penalty) best = { mask, matrix: m, penalty };
  }

  return best!.matrix.modules.map((row) => row.map((cell) => cell === true));
}
