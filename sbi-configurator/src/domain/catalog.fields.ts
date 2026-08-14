import type { FieldId, ModelSize } from './types';
import { MODEL_SIZES } from './types';
import { BLOCK_TYPES } from './catalog.blocks';
import { RAILS } from './catalog.rails';

/**
 * De configurator als data.
 *
 * In v1.8 stond elke stap als ~25 regels handgeschreven HTML in het document —
 * vijftien keer bijna hetzelfde, samen zo'n 375 van de 793 regels markup. Een
 * optie toevoegen betekende drie plekken bijwerken die uit de pas konden lopen.
 *
 * Hier is een stap een object. De interface wordt eruit gegenereerd, dus een
 * nieuwe optie is één regel data — geen HTML, geen `onclick`, geen `getElementById`.
 */

/** Veld dat wel in de wizard staat maar niet in de bestelcode. */
export type ExtraVeldId = 'aantalConfiguraties';
export type WizardVeldId = FieldId | ExtraVeldId;

export interface KeuzeSpec {
  /** Wat in de bestelcode terechtkomt. Lege string = "geen symbool". */
  readonly code: string;
  /** Het korte teken op de knop; '—' waar de code leeg is. */
  readonly badge: string;
  /** De omschrijving onder de badge. */
  readonly label: string;
  /** Beperkt tot deze maten; afwezig betekent: geen beperking vastgelegd. */
  readonly models?: readonly ModelSize[];
  /** Vereist overleg met MCA (wordt als hint getoond, blokkeert niet). */
  readonly opAanvraag?: boolean;
}

interface BasisVeld {
  /** Stapnummer zoals de klant het ziet, en zoals v1.8 het nummerde. */
  readonly stap: number;
  readonly id: WizardVeldId;
  readonly titel: string;
  readonly omschrijving: string;
}

export interface KeuzeVeld extends BasisVeld {
  readonly soort: 'keuze';
  readonly keuzes: readonly KeuzeSpec[];
  /** Index van de optie die bij de eerste interactie voorgeselecteerd wordt. */
  readonly standaardIndex?: number;
  /** Extra knop die een eigen route start (stap 2: "geen loopwagen"). */
  readonly uitzondering?: { readonly actie: 'geenLoopwagen'; readonly label: string };
}

export interface GetalVeld extends BasisVeld {
  readonly soort: 'getal';
  readonly eenheid: 'mm' | 'stuks';
  readonly min: number;
  readonly max: number;
  readonly standaard?: number;
  readonly plaatshouder?: string;
}

export interface SteekVeld extends BasisVeld {
  readonly soort: 'steek';
  readonly min: number;
  readonly max: number;
}

export type VeldSpec = KeuzeVeld | GetalVeld | SteekVeld;

/** Kortweg: "geen symbool" — de standaardkeuze die niets aan de code toevoegt. */
const geenSymbool = (label: string): KeuzeSpec => ({ code: '', badge: '—', label });

export const VELDEN: readonly VeldSpec[] = [
  {
    soort: 'keuze',
    stap: 1,
    id: 'model',
    titel: 'Model (maatcode)',
    omschrijving:
      'Kies het railmodel op basis van de gewenste afmetingen.',
    keuzes: MODEL_SIZES.map((size) => ({
      code: `SBI${size}`,
      badge: `SBI${size}`,
      label: `Maat ${size}`,
    })),
  },
  {
    soort: 'keuze',
    stap: 2,
    id: 'blockType',
    titel: 'Loopwagen',
    omschrijving: 'Kies hieronder de gewenste loopwagen.',
    keuzes: BLOCK_TYPES.map((b) => ({
      code: b.code,
      badge: b.code,
      label: b.label,
      ...(b.models ? { models: b.models } : {}),
    })),
    uitzondering: {
      actie: 'geenLoopwagen',
      label: 'Ik heb geen loopwagen nodig, alleen een railconfiguratie',
    },
  },
  {
    soort: 'keuze',
    stap: 3,
    id: 'grease',
    titel: 'Smeernippelpositie',
    omschrijving: 'Standaard zit de smeernippel aan de voorkant. Voor zijkant neemt MCA contact met u op.',
    standaardIndex: 0,
    keuzes: [
      geenSymbool('Voorzijde (geen symbool)'),
      { code: 'N', badge: 'N', label: 'Zijkant (contact opnemen)', opAanvraag: true },
    ],
  },
  {
    soort: 'keuze',
    stap: 4,
    id: 'accuracy',
    titel: 'Nauwkeurigheidsklasse',
    omschrijving: 'Klasse H (Hoog, voorkeurstype) voor de meeste machinebouwtoepassingen.',
    standaardIndex: 0,
    keuzes: [
      { code: 'H', badge: 'H', label: 'Hoog (voorkeurstype)' },
      { code: 'P', badge: 'P', label: 'Precisie (OP AANVRAAG)', opAanvraag: true },
    ],
  },
  {
    soort: 'keuze',
    stap: 5,
    id: 'preload',
    titel: 'Voorspanning',
    omschrijving: 'K1 is het voorkeurstype voor de meeste toepassingen. K3 voor maximale stijfheid bij zware belasting.',
    standaardIndex: 1,
    keuzes: [
      { code: 'K0', badge: 'K0', label: 'Geen voorspanning (op aanvraag)', opAanvraag: true },
      { code: 'K1', badge: 'K1', label: 'Standaard (voorkeurstype)' },
      { code: 'K2', badge: 'K2', label: 'Gemiddelde voorspanning (op aanvraag)', opAanvraag: true },
      { code: 'K3', badge: 'K3', label: 'Zware voorspanning (op aanvraag)', opAanvraag: true },
    ],
  },
  {
    soort: 'keuze',
    stap: 6,
    id: 'container',
    titel: 'Smeercontainer',
    omschrijving: 'MF (Smeervilt) voor toepassingen waarbij smeerpunt(en) lastig bereikbaar zijn.',
    standaardIndex: 0,
    keuzes: [geenSymbool('Standaard (geen symbool)'), { code: 'MF', badge: 'MF', label: 'Smeervilt' }],
  },
  {
    soort: 'keuze',
    stap: 7,
    id: 'seal',
    titel: 'Afdichting',
    omschrijving: 'Kies afdichting op basis van omgevingsomstandigheden.',
    standaardIndex: 0,
    keuzes: [
      geenSymbool('Standaard (Normale condities)'),
      { code: 'DD', badge: 'DD', label: 'Dubbele afdichting (Stoffige condities)' },
      { code: 'ZZ', badge: 'ZZ', label: 'Afdichting ZZ (Lasspatten)' },
      { code: 'KK', badge: 'KK', label: 'Afdichting KK (Stof en lasspatten)' },
    ],
  },
  {
    soort: 'keuze',
    stap: 8,
    id: 'blockQty',
    titel: 'Aantal loopwagens per rail',
    omschrijving: 'Geen symbool = 1 loopwagen per rail. Vermeld het gewenste aantal bij meerdere loopwagens.',
    keuzes: [
      // LET OP: v1.8 zet hier '1' in de bestelcode terwijl het label "geen
      // symbool" zegt. MCA heeft bevestigd dat er geen 1 in de code hoort
      // (vraag 3); dat wordt in fase 3 gewijzigd met eigen ADR. Tot dan blijft
      // de code '1' zodat fase 2 gedragsneutraal is.
      { code: '1', badge: '1', label: '1 loopwagen (geen symbool)' },
      { code: '2', badge: '2', label: '2 loopwagens' },
      { code: '3', badge: '3', label: '3 loopwagens' },
      { code: '4', badge: '4', label: '4 loopwagens' },
    ],
  },
  {
    soort: 'keuze',
    stap: 9,
    id: 'endPlate',
    titel: 'Eindplaat hoge temperatuur',
    omschrijving: 'HT-eindplaat is vereist bij aanhoudende omgevingstemperaturen boven 80°C.',
    standaardIndex: 0,
    keuzes: [geenSymbool('Standaard (geen symbool)'), { code: 'HT', badge: 'HT', label: 'Hoge temp. eindplaat' }],
  },
  {
    soort: 'keuze',
    stap: 10,
    id: 'surface',
    titel: 'Oppervlaktebehandeling',
    omschrijving: 'FCR (Fluor Carbon Raydent) biedt extra corrosiebescherming voor vochtige of agressieve omgevingen.',
    standaardIndex: 0,
    keuzes: [geenSymbool('Standaard (geen symbool)'), { code: 'FCR', badge: 'FCR', label: 'Fluor Carbon Raydent' }],
  },
  {
    soort: 'keuze',
    stap: 11,
    id: 'bottomMount',
    titel: 'Rail montage',
    omschrijving: 'B = draadgaten onderzijde voor bevestiging van onderen. Standaard = bovenmontage.',
    standaardIndex: 0,
    keuzes: [geenSymbool('Standaard (geen symbool)'), { code: 'B', badge: 'B', label: 'Draadgaten onderzijde' }],
  },
  {
    soort: 'getal',
    stap: 12,
    id: 'railLength',
    titel: 'Raillengte',
    omschrijving:
      'Voer de gewenste raillengte in millimeters in. Boven de maximale handelslengte van het gekozen model wordt de rail automatisch opgesplitst in gekoppelde delen (zie stap 12B hieronder).',
    eenheid: 'mm',
    min: 100,
    max: 12000,
    plaatshouder: 'bv. 800',
  },
  {
    soort: 'steek',
    stap: 13,
    id: 'pitch',
    titel: 'Steek eerste/laatste gat',
    omschrijving:
      'Hartafstand van het eerste en laatste bevestigingsgat tot het railuiteinde in mm (bv. 20/20).',
    min: 5,
    max: 200,
  },
  {
    soort: 'keuze',
    stap: 14,
    id: 'railsPerAxis',
    titel: 'Aantal rails per as',
    omschrijving: 'Standaard is 1 rij. II, III of IV voor parallelle railconfiguraties.',
    keuzes: [
      { code: '', badge: 'I', label: '1 rij (geen symbool)' },
      { code: 'II', badge: 'II', label: '2 rijen' },
      { code: 'III', badge: 'III', label: '3 rijen' },
      { code: 'IV', badge: 'IV', label: '4 rijen' },
    ],
  },
  {
    soort: 'getal',
    stap: 15,
    id: 'aantalConfiguraties',
    titel: 'Aantal configuraties',
    omschrijving: 'Hoeveel identieke sets van bovenstaande configuratie wilt u aanvragen?',
    eenheid: 'stuks',
    min: 1,
    max: 500,
    standaard: 1,
  },
];

/** Het totale aantal stappen dat de voortgangsbalk telt. */
export const AANTAL_STAPPEN = VELDEN.length;

/** Zoek een veld op stapnummer. */
export function veldVanStap(stap: number): VeldSpec | undefined {
  return VELDEN.find((v) => v.stap === stap);
}

/** De stappen die worden overgeslagen bij "geen loopwagen". */
export const STAPPEN_ZONDER_LOOPWAGEN = [3, 4, 5, 6, 7, 8, 9] as const;

/** Grenzen voor de raillengte, gegeven het gekozen model. */
export function lengteGrenzen(size: ModelSize | null): { min: number; max: number; handelslengte: number | null } {
  const veld = VELDEN.find((v) => v.id === 'railLength') as GetalVeld;
  return {
    min: veld.min,
    max: veld.max,
    handelslengte: size === null ? null : RAILS[size].maxL,
  };
}
