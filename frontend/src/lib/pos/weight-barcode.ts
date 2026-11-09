// Scale-printed weight-embedded barcode scheme for weighed items (produce/
// bakery/deli sold by kg) — see the "SUP" supermarket POS. A weighing scale
// prints a sticker whose barcode encodes the item's PLU code and its
// measured weight; the cashier scans it like any other barcode. This is
// this system's own convention (13 digits, EAN-13-shaped), not tied to any
// specific scale hardware — GS1 reserves the "2" prefix worldwide for
// exactly this kind of internal, store-generated, variable-weight barcode,
// so real manufacturer barcodes never legitimately collide with it.
//
// Layout (13 digits total):
//   position 1      "2"           fixed prefix flagging a weight-embedded barcode
//   positions 2-6   PLU code      5 digits, zero-padded
//   positions 7-12  weight (g)    6 digits, zero-padded (up to 999.999 kg)
//   position 13     check digit   standard EAN-13 check digit over positions 1-12
//
// Example: PLU 00002, weight 685g → "200002000685" (12 digits) + check digit
// "1" → full barcode "2000020006851".

export interface WeightBarcodeInfo {
  plu: string;
  weightKg: number;
}

const WEIGHT_BARCODE_PATTERN = /^2\d{12}$/;

/** Standard EAN-13 check digit: odd-position digits (1-indexed) ×1, even-position ×3, sum mod 10. */
function computeEan13CheckDigit(first12Digits: string): number {
  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(first12Digits[i]);
    // i is 0-indexed here; 1-indexed position i+1 is odd when i is even.
    if (i % 2 === 0) oddSum += digit;
    else evenSum += digit;
  }
  const total = oddSum + evenSum * 3;
  return (10 - (total % 10)) % 10;
}

/**
 * Parses a scanned code as a weight-embedded barcode. Returns null for
 * anything that isn't exactly 13 digits starting with "2" or that fails the
 * check digit — callers should transparently fall back to a normal exact-
 * barcode lookup in that case, not treat it as an error.
 */
export function parseWeightBarcode(code: string): WeightBarcodeInfo | null {
  if (!WEIGHT_BARCODE_PATTERN.test(code)) return null;

  const first12 = code.slice(0, 12);
  const checkDigit = Number(code[12]);
  if (computeEan13CheckDigit(first12) !== checkDigit) return null;

  const plu = code.slice(1, 6);
  const weightGrams = Number(code.slice(6, 12));
  return { plu, weightKg: weightGrams / 1000 };
}
