import type { ModelSize, RailSpec } from './types';
import { MODEL_SIZES } from './types';

/**
 * Maatgegevens per railmaat.
 *
 * Bron: `Bron bestanden/SBI maatgegevens (absoluut).xlsx` (SharePoint-map
 * "Gekoppelde rails tbv intern gebruik"), aangevuld met `minLast` uit v1.8
 * waarvoor geen bron te vinden was — zie docs/vragen-aan-MCA.md vraag 2.
 *
 * De xlsx noemt daarnaast een kolom "Steek F bij koppelpunten" die identiek is
 * aan F. Dat is geen toeval maar een eis: aan weerszijden van een naad zit een
 * halve steek (K = F/2), zodat de gatafstand óver de koppeling heen exact F is.
 * Die eigenschap wordt in de tests afgedwongen.
 *
 * Let op: de catalogus noemt bij `L0 max` 3000 (SBI15) respectievelijk 4000 mm.
 * De handelslengtes hieronder zijn strenger — zie vraag 5.
 */
export const RAILS: Readonly<Record<ModelSize, RailSpec>> = Object.freeze({
  15: Object.freeze({ size: 15, F: 60, Gmin: 6, maxL: 2960, minLast: 216 }),
  20: Object.freeze({ size: 20, F: 60, Gmin: 7, maxL: 3960, minLast: 217 }),
  25: Object.freeze({ size: 25, F: 60, Gmin: 8, maxL: 3960, minLast: 218 }),
  30: Object.freeze({ size: 30, F: 80, Gmin: 9, maxL: 3960, minLast: 289 }),
  35: Object.freeze({ size: 35, F: 80, Gmin: 9, maxL: 3960, minLast: 289 }),
  45: Object.freeze({ size: 45, F: 105, Gmin: 12, maxL: 3960, minLast: 379.5 }),
  55: Object.freeze({ size: 55, F: 120, Gmin: 14, maxL: 3960, minLast: 434 }),
  65: Object.freeze({ size: 65, F: 150, Gmin: 15, maxL: 3960, minLast: 540 }),
});

/** Zet 'SBI20' om naar 20. Geeft null bij een onbekende of ontbrekende code. */
export function parseModelCode(code: string | undefined | null): ModelSize | null {
  if (!code) return null;
  const n = Number.parseInt(code.replace(/^SBI/i, ''), 10);
  return (MODEL_SIZES as readonly number[]).includes(n) ? (n as ModelSize) : null;
}

/** Zet 20 om naar 'SBI20'. */
export function modelCode(size: ModelSize): string {
  return `SBI${size}`;
}

/** Haalt de specificatie op bij een bestelcode-fragment als 'SBI20'. */
export function railFor(code: string | undefined | null): RailSpec | null {
  const size = parseModelCode(code);
  return size === null ? null : RAILS[size];
}
