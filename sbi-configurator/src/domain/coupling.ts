import type { AutoParts, LengthSuggestion, RailPart } from './types';
import { calcAutoG } from './pitch';

/**
 * Tolerantie waarmee "is dit een heel aantal steken" wordt beoordeeld.
 * Overgenomen uit v1.8; nodig omdat minLast bij SBI45 met 379,5 mm een halve
 * millimeter is en de tussenresultaten dus niet exact in binair passen.
 */
const EPS = 1e-9;

export interface CouplingInput {
  /** Gewenste totale raillengte [mm]. */
  readonly totalLen: number;
  /** Eindmaat aan de linkerkant [mm]. */
  readonly G1: number;
  /** Eindmaat aan de rechterkant [mm]. */
  readonly G2: number;
  /** Steek [mm]. */
  readonly F: number;
  /** Koppelmaat = F/2 [mm]. */
  readonly K: number;
  /** Maximale lengte van één deel [mm]. */
  readonly maxL: number;
  /** Minimale lengte van het laatste deel [mm]. */
  readonly minLast: number;
}

/**
 * Verdeelt een rail over `numParts` gekoppelde delen.
 *
 * Het eerste deel begint met de opgegeven eindmaat G1 en eindigt op een halve
 * steek (K) vóór de naad; middendelen hebben aan beide kanten K en zijn zo lang
 * mogelijk; het laatste deel eindigt met G2. Doordat elke naad K aan beide
 * zijden heeft, is de gatafstand óver een koppeling heen exact F.
 *
 * Zoekt aflopend over het aantal gaten in het eerste deel en geeft de eerste
 * passende oplossing terug — dus het langst mogelijke eerste deel.
 *
 * VERBATIM geport uit v1.8 `cpComputeParts` (regel 2806). De zoekrichting,
 * de tolerantie en de volgorde van de controles bepalen de uitkomst; de golden
 * master zet ze vast over 92.582 gevallen.
 *
 * @returns De delen, of `null` als er geen geldige verdeling bestaat.
 */
export function computeParts(input: CouplingInput, numParts: number): RailPart[] | null {
  const { totalLen, G1, G2, F, K, maxL, minLast } = input;

  const n1max = Math.floor((maxL - G1 - K) / F);
  const nmidMax = Math.floor((maxL - 2 * K) / F);
  if (n1max < 0 || nmidMax < 0) return null;

  const LmidFull = K + nmidMax * F + K;

  if (numParts === 1) {
    const nSingle = (totalLen - G1 - G2) / F;
    if (nSingle < 0 || Math.abs(nSingle - Math.round(nSingle)) > EPS) return null;
    const n = Math.round(nSingle);
    if (totalLen > maxL) return null;
    if (totalLen < minLast) return null;
    return [{ L: totalLen, gStart: G1, n, gEnd: G2, isFirst: true, isLast: true }];
  }

  for (let n1 = n1max; n1 >= 0; n1--) {
    const L1 = G1 + n1 * F + K;
    if (L1 > maxL) continue;

    const midCount = numParts - 2;
    const Lp = totalLen - L1 - midCount * LmidFull;

    if (Lp <= 0 || Lp > maxL) continue;
    if (Lp < minLast) continue;

    const npf = (Lp - K - G2) / F;
    if (Math.abs(npf - Math.round(npf)) > EPS) continue;
    const np = Math.round(npf);
    if (np < 0) continue;

    const parts: RailPart[] = [];
    // `isLast: numParts === 1` is hier per definitie false — deze tak wordt
    // alleen bereikt als numParts > 1. Letterlijk overgenomen uit v1.8 zodat de
    // golden master klopt; op te ruimen zodra de pariteitscontrole eraf mag.
    parts.push({ L: L1, gStart: G1, n: n1, gEnd: K, isFirst: true, isLast: numParts === 1 });
    for (let m = 0; m < midCount; m++) {
      parts.push({ L: LmidFull, gStart: K, n: nmidMax, gEnd: K, isFirst: false, isLast: false });
    }
    parts.push({ L: Lp, gStart: K, n: np, gEnd: G2, isFirst: false, isLast: true });
    return parts;
  }
  return null;
}

/**
 * Zoekt het kleinste aantal delen waarmee de lengte te maken is.
 *
 * VERBATIM geport uit v1.8 `cpAutoNumParts` (regel 2900), inclusief de
 * bovengrens van 30 delen. Let op: het invoerveld in v1.8 stond op max 20 —
 * die mismatch wordt in fase 3 rechtgezet.
 */
export function autoNumParts(input: CouplingInput): AutoParts | null {
  const minParts = Math.max(1, Math.ceil(input.totalLen / input.maxL));
  for (let p = minParts; p <= 30; p++) {
    const result = computeParts(input, p);
    if (result) return { numParts: p, parts: result };
  }
  return null;
}

/**
 * Zoekt raillengtes in de buurt die wél een geldige verdeling opleveren.
 *
 * VERBATIM geport uit v1.8 `cpFindSuggestions` (regel 2849) — INCLUSIEF het
 * defect dat in docs/decisions.md als V-001 staat: de reeks begint op
 * `-maxL*3`, en omdat dat voor F = 80, 105 en 150 geen veelvoud van de steek
 * is, liggen alle kandidaten bij SBI30/35/45/65 een deel van een steek naast
 * het raster en vindt de functie daar nóóit iets.
 *
 * Dat is opzet: fase 1 moet gedragsidentiek zijn aan v1.8. De reparatie is
 * fase 3, met een eigen commit en een verschuiving van de fixtures.
 */
export function findSuggestions(input: CouplingInput, count = 5): LengthSuggestion[] {
  const { totalLen: desired, G1, G2, F, K, maxL, minLast } = input;

  const results: LengthSuggestion[] = [];
  const step = F;
  const zoekbereik = maxL * 3; // heette `window` in v1.8 en schaduwde daar het globale window-object

  for (let delta = -zoekbereik; delta <= zoekbereik; delta += step) {
    const candidate = desired + delta;
    if (candidate <= 0) continue;
    if (candidate === desired) continue;

    const parts = computeParts(
      { totalLen: candidate, G1, G2, F, K, maxL, minLast },
      Math.max(1, Math.ceil(candidate / maxL))
    );
    if (parts) {
      results.push({
        len: candidate,
        delta,
        parts,
        numParts: parts.length,
        lastLen: parts[parts.length - 1]!.L,
      });
    }
  }

  // Dichtstbijzijnde eerst; bij gelijke afwijking wint de lángere rail.
  results.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta) || b.delta - a.delta);

  const seen = new Set<number>();
  return results
    .filter((r) => {
      if (seen.has(r.len)) return false;
      seen.add(r.len);
      return true;
    })
    .slice(0, count);
}

export interface SimpleLengthSuggestion {
  readonly len: number;
  readonly delta: number;
  readonly G: number;
}

/**
 * Suggesties voor stap 12 zolang de rail nog binnen één handelslengte past.
 *
 * VERBATIM geport uit v1.8 `step9FindSuggestions` (regel 2192) — de naam
 * verwees nog naar een oude stapnummering. Hier is het zoekbereik `F * 6` en
 * dus per definitie een veelvoud van de steek, waardoor deze functie géén last
 * heeft van V-001.
 */
export function findLengthSuggestions(
  desired: number,
  F: number,
  Gmin: number,
  maxL: number,
  count = 6
): SimpleLengthSuggestion[] {
  const results: SimpleLengthSuggestion[] = [];
  const zoekbereik = F * 6;

  for (let delta = -zoekbereik; delta <= zoekbereik; delta += F) {
    const candidate = desired + delta;
    if (candidate <= 0 || candidate > maxL || candidate === desired) continue;
    const { G } = calcAutoG(candidate, F, Gmin);
    results.push({ len: candidate, delta, G });
  }

  results.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta) || b.delta - a.delta);
  return results.slice(0, count);
}
