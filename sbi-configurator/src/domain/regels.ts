/**
 * Combinaties die MCA niet levert.
 *
 * Een regel zegt: als in stap `als.stap` de code `als.code` gekozen is, dan
 * mag in `stap` alleen nog uit `toegestaan` gekozen worden. `''` is de
 * standaardoptie (geen symbool in de bestelcode).
 */
export interface Uitsluiting {
  readonly als: { readonly stap: number; readonly code: string };
  readonly stap: number;
  readonly toegestaan: readonly string[];
  /** Korte uitleg voor de klant, getoond bij de uitgesloten opties. */
  readonly reden: string;
  /**
   * Bij een lege `toegestaan`: de stap vervalt. Er komt geen symbool in de
   * bestelcode en de klant ziet dit label als keuze.
   */
  readonly vervaltAls?: string;
}

export const UITSLUITINGEN: readonly Uitsluiting[] = [
  // De HT-eindplaat combineert niet met de MF-smeercontainer, en is zelf de
  // afdichting: stap 7 vervalt dan helemaal (opgave MCA, 13-10-2026).
  {
    als: { stap: 9, code: 'HT' },
    stap: 6,
    toegestaan: [''],
    reden: 'MF is niet mogelijk met een HT-eindplaat (stap 9).',
  },
  {
    als: { stap: 9, code: 'HT' },
    stap: 7,
    toegestaan: [],
    reden: 'Met een HT-eindplaat (stap 9) is er geen aparte afdichting: de HT-eindplaat is de afdichting.',
    vervaltAls: 'Geen afdichting (HT-eindplaat)',
  },
];

/** Gekozen code per stap; een stap zonder keuze ontbreekt. */
export type Keuzes = Readonly<Record<number, string | undefined>>;

/** De regels die bij deze keuzes van kracht zijn. */
export function actieveUitsluitingen(keuzes: Keuzes): Uitsluiting[] {
  return UITSLUITINGEN.filter((r) => keuzes[r.als.stap] === r.als.code);
}

/** Of `code` in `stap` gekozen mag worden, gegeven de andere keuzes. */
export function isToegestaan(stap: number, code: string, keuzes: Keuzes): boolean {
  return actieveUitsluitingen(keuzes).every((r) => r.stap !== stap || r.toegestaan.includes(code));
}
