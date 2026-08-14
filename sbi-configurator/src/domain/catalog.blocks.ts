import type { BlockTypeCode, ModelSize } from './types';

export interface BlockTypeSpec {
  readonly code: BlockTypeCode;
  /** Omschrijving zoals de klant hem ziet. */
  readonly label: string;
  /**
   * Voor welke maten dit type leverbaar is. `null` = geen beperking bekend.
   *
   * Let op: `null` betekent nadrukkelijk *niet* "leverbaar in alles" maar
   * "hierover is geen regel vastgelegd". v1.8 filterde alleen op vier types;
   * MCA heeft gevraagd dat zo te laten (vraag 6) tot de leverancier de actuele
   * matrix bevestigt. Zodra die er is, is dit één regel per type.
   */
  readonly models: readonly ModelSize[] | null;
  /** Waar de beperking vandaan komt, of waarom hij ontbreekt. */
  readonly bron: string;
}

const ONBEKEND = 'Geen beperking vastgelegd in v1.8 — zie docs/vragen-aan-MCA.md vraag 6';
const V18 = 'Overgenomen uit v1.8 (data-models-attribuut), bevestigd door MCA vraag 6';

/**
 * De veertien loopwagentypes.
 *
 * In v1.8 stonden code, badge en omschrijving los van elkaar in de HTML,
 * verspreid over het `onclick`-argument, een `.opt-code` en een `.opt-label`.
 * Die konden uit de pas lopen — en deden dat ook: FLS en FV dragen allebei de
 * omschrijving "Flens uitvoering kort", SLS en SV allebei "Blok uitvoering
 * kort". De labels zijn hier letterlijk overgenomen zodat fase 2 niets aan de
 * zichtbare tekst verandert; het oplossen van die dubbeling staat als vraag 14.
 */
export const BLOCK_TYPES: readonly BlockTypeSpec[] = [
  { code: 'FL',  label: 'Flens uitvoering',         models: null,                   bron: ONBEKEND },
  { code: 'FLL', label: 'Flens uitvoering lang',    models: null,                   bron: ONBEKEND },
  { code: 'FLS', label: 'Flens uitvoering kort',    models: [15, 20, 25, 30, 35],   bron: V18 },
  { code: 'SL',  label: 'Blok uitvoering',          models: null,                   bron: ONBEKEND },
  { code: 'SLL', label: 'Blok uitvoering lang',     models: null,                   bron: ONBEKEND },
  { code: 'SLS', label: 'Blok uitvoering kort',     models: [15, 20, 25, 30, 35],   bron: V18 },
  { code: 'HL',  label: 'Lage uitvoering',          models: null,                   bron: ONBEKEND },
  { code: 'HLS', label: 'Lage uitvoering kort',     models: [15, 20, 25, 30, 35],   bron: V18 },
  { code: 'HLL', label: 'Lage uitvoering lang',     models: null,                   bron: ONBEKEND },
  { code: 'CL',  label: 'Compacte uitvoering',      models: null,                   bron: ONBEKEND },
  { code: 'CLS', label: 'Compacte uitvoering kort', models: [20],                   bron: V18 },
  { code: 'CLL', label: 'Compacte uitvoering lang', models: null,                   bron: ONBEKEND },
  { code: 'FV',  label: 'Flens uitvoering kort',    models: null,                   bron: ONBEKEND },
  { code: 'SV',  label: 'Blok uitvoering kort',     models: null,                   bron: ONBEKEND },
];

/** Is dit loopwagentype leverbaar voor deze maat? */
export function isLeverbaar(spec: BlockTypeSpec, size: ModelSize | null): boolean {
  if (size === null) return true;
  if (spec.models === null) return true;
  return spec.models.includes(size);
}

/** De types die voor een maat wegvallen, in de volgorde waarin ze getoond worden. */
export function nietLeverbaarVoor(size: ModelSize | null): BlockTypeSpec[] {
  if (size === null) return [];
  return BLOCK_TYPES.filter((b) => !isLeverbaar(b, size));
}
