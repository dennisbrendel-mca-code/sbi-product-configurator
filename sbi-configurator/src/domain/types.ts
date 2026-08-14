/**
 * Kerntypen van het SBI-domein.
 *
 * Deze laag heeft NUL afhankelijkheden en raakt de DOM niet aan. Als de UI over
 * drie jaar herbouwd wordt, blijft alles hieronder ongewijzigd staan.
 */

/** De acht maatcodes uit de catalogus. */
export type ModelSize = 15 | 20 | 25 | 30 | 35 | 45 | 55 | 65;

export const MODEL_SIZES = [15, 20, 25, 30, 35, 45, 55, 65] as const satisfies readonly ModelSize[];

/**
 * De veertien loopwagentypes.
 *
 * FLS/SLS/HLS/CLS zijn de korte uitvoeringen ("Short Block Length" bij SBC
 * Linear). Catalogus V13-2019 noemt FLS en SLS niet, maar de leverancier voert
 * ze wel — zie docs/vragen-aan-MCA.md vraag 6.
 */
export type BlockTypeCode =
  | 'FL' | 'FLL' | 'FLS'
  | 'SL' | 'SLL' | 'SLS'
  | 'HL' | 'HLL' | 'HLS'
  | 'CL' | 'CLL' | 'CLS'
  | 'FV' | 'SV';

/**
 * Specificatie van één railmaat.
 *
 * Herkomst per veld is bewust gedocumenteerd: zonder bron kunnen deze getallen
 * nooit verantwoord of bijgewerkt worden.
 */
export interface RailSpec {
  /** Maatcode, bv. 20 voor SBI20. */
  readonly size: ModelSize;
  /** Steek tussen de bevestigingsgaten [mm]. Bron: xlsx + catalogus p9-20. */
  readonly F: number;
  /** Minimale hartafstand rand → eerste gat [mm]. Bron: xlsx + catalogus p9-20. */
  readonly Gmin: number;
  /** Maximale handelslengte [mm]. Bron: xlsx ("Max. raillengte"). */
  readonly maxL: number;
  /**
   * Minimale lengte van het laatste, op maat gezaagde deel [mm].
   *
   * LET OP: geen aantoonbare bron. Staat niet in de xlsx en niet in de
   * catalogus. Overgenomen uit v1.8 en vastgezet met een test, zodat wijzigen
   * altijd bewust is. Zie docs/vragen-aan-MCA.md vraag 2.
   */
  readonly minLast: number;
}

/** Koppelmaat: halve steek aan weerszijden van een naad, samen precies één F. */
export function koppelmaat(rail: Pick<RailSpec, 'F'>): number {
  return rail.F / 2;
}

/** Eén deel van een gekoppelde rail. */
export interface RailPart {
  /** Lengte van dit deel [mm]. */
  readonly L: number;
  /** Afstand van de linkerrand tot het eerste gat [mm]. */
  readonly gStart: number;
  /** Aantal steek-intervallen in dit deel. */
  readonly n: number;
  /** Afstand van het laatste gat tot de rechterrand [mm]. */
  readonly gEnd: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}

/** Resultaat van de automatische G-berekening. */
export interface AutoG {
  /** Berekende eindmaat G1 = G2 [mm]. */
  readonly G: number;
  /** Bijbehorend aantal steek-intervallen. Kan 0 zijn bij L < F (zie V-005). */
  readonly n: number;
}

/** Eén voorgestelde alternatieve raillengte. */
export interface LengthSuggestion {
  readonly len: number;
  readonly delta: number;
  readonly parts: readonly RailPart[];
  readonly numParts: number;
  readonly lastLen: number;
}

/** Resultaat van het automatisch bepalen van het aantal delen. */
export interface AutoParts {
  readonly numParts: number;
  readonly parts: readonly RailPart[];
}

/**
 * De veertien velden van de samengestelde bestelcode, in catalogusvolgorde
 * (`besteolcodes mca.png`, "Codering voor samengestelde rail en loopwagen").
 */
export type FieldId =
  | 'model'         // [1]  SBI15..SBI65
  | 'blockType'     // [2]  FL, FLL, …
  | 'grease'        // [3]  '' (voorkant) | 'N' (zijkant)
  | 'container'     // [4]  '' | 'MF'
  | 'seal'          // [5]  '' | 'DD' | 'ZZ' | 'KK'
  | 'blockQty'      // [6]  aantal loopwagens op de rail
  | 'preload'       // [7]  K0 | K1 | K2 | K3
  | 'endPlate'      // [8]  '' | 'HT'
  | 'railLength'    // [9]  lengte in mm
  | 'accuracy'      // [10] H | P
  | 'surface'       // [11] '' | 'FCR'
  | 'bottomMount'   // [12] '' | 'B'
  | 'pitch'         // [13] 'G1/G2'
  | 'railsPerAxis'; // [14] '' | 'II' | 'III' | 'IV'

/**
 * De veldvolgorde van de bestelcode.
 *
 * In v1.8 stond dit als `const order = [1,2,3,6,7,8,5,9,12,4,10,11,13,14]` —
 * een permutatie van stapnummers die alleen met de comment ernaast te begrijpen
 * was. Hier is de codevolgorde leidend en is de wizardvolgorde er een aparte
 * lijst naast, zodat het herschikken van de UI de bestelcode nooit meer kan
 * breken.
 */
export const ORDER_CODE_FIELDS = [
  'model',
  'blockType',
  'grease',
  'container',
  'seal',
  'blockQty',
  'preload',
  'endPlate',
  'railLength',
  'accuracy',
  'surface',
  'bottomMount',
  'pitch',
  'railsPerAxis',
] as const satisfies readonly FieldId[];

/** Een (deels ingevulde) configuratie: veld → codefragment. */
export type Selection = Partial<Record<FieldId, string>>;
