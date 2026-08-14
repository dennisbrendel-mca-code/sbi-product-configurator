import type { Selection } from './types';
import { ORDER_CODE_FIELDS } from './types';

/**
 * Stelt de SBI-bestelcode samen.
 *
 * Velden die leeg zijn vallen weg — dat is het "geen symbool"-principe van de
 * SBI-codering: een standaardoptie levert geen letter op. Velden die de klant
 * nog niet heeft ingevuld vallen om dezelfde reden weg, zodat de code al
 * meegroeit tijdens het configureren.
 *
 * Gedrag identiek aan v1.8 `buildCode()` (regel 2550), maar zonder de magische
 * stapnummer-permutatie: de volgorde staat nu als veldnamen in
 * `ORDER_CODE_FIELDS`.
 *
 * Het aantal configuraties (stap 15 in v1.8) hoort bewust NIET in de code — dat
 * gaat alleen mee in de offerteaanvraag.
 */
export function buildOrderCode(selection: Selection): string {
  return ORDER_CODE_FIELDS
    .map((field) => selection[field])
    .filter((value): value is string => value !== undefined && value !== '')
    .join('-');
}

/**
 * Vertaalt de stapnummers van v1.8 naar veldnamen.
 *
 * Alleen bedoeld voor de pariteitscontrole tegen de golden master en voor het
 * inlezen van oude deellinks. Nieuwe code werkt met `FieldId`.
 */
export const LEGACY_STEP_TO_FIELD = {
  1: 'model',
  2: 'blockType',
  3: 'grease',
  4: 'accuracy',
  5: 'preload',
  6: 'container',
  7: 'seal',
  8: 'blockQty',
  9: 'endPlate',
  10: 'surface',
  11: 'bottomMount',
  12: 'railLength',
  13: 'pitch',
  14: 'railsPerAxis',
  // 15 (aantal configuraties) heeft bewust geen veld in de bestelcode.
} as const;

/** Zet een v1.8-`selections`-object om naar een `Selection`. */
export function fromLegacySelections(legacy: Record<string | number, string | undefined>): Selection {
  const out: Selection = {};
  for (const [step, field] of Object.entries(LEGACY_STEP_TO_FIELD)) {
    const value = legacy[step];
    if (value !== undefined) out[field] = value;
  }
  return out;
}
