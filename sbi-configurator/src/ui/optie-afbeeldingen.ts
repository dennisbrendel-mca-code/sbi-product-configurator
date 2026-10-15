/**
 * Productfoto's in de keuzeknoppen.
 *
 * De markup van v1.8 is gegenereerd en wordt niet met de hand aangepast; de
 * foto's worden daarom ná het opbouwen van de shadow root in de knoppen gezet.
 * De knoppen zelf, hun `onclick` en hun tekst blijven ongewijzigd, zodat de
 * logica en de pariteitstests er niets van merken.
 *
 * Bron: de afbeeldingen in `Bron bestanden/loopwagens/` en
 * `Bron bestanden/opties/`, omgezet naar WebP van 320 px breed. Door
 * `assetsInlineLimit` gaan ze als data-URI mee in het ene HTML-bestand.
 */
import { codeVan } from './opt-knop';

const BESTANDEN = import.meta.glob<string>('./afbeeldingen/**/*.webp', {
  eager: true,
  import: 'default',
});

/** `loopwagens/FL` → data-URI */
function bestand(naam: string): string | undefined {
  return BESTANDEN[`./afbeeldingen/${naam}.webp`];
}

/**
 * Per stap: optiecode → afbeelding. De standaardoptie heeft geen code en
 * staat hier als `''`.
 */
const PER_STAP: Record<number, Record<string, string>> = {
  2: {
    FL: 'loopwagens/FL',
    FLL: 'loopwagens/FLL',
    FLS: 'loopwagens/FLS',
    SL: 'loopwagens/SL',
    SLL: 'loopwagens/SLL',
    SLS: 'loopwagens/SLS',
    HL: 'loopwagens/HL',
    HLS: 'loopwagens/HLS',
    // Geen aparte foto aangeleverd; op verzoek wordt die van HL getoond.
    HLL: 'loopwagens/HL',
    CL: 'loopwagens/CL',
    CLS: 'loopwagens/CLS',
    CLL: 'loopwagens/CLL',
    FV: 'loopwagens/FV',
    SV: 'loopwagens/SV',
  },
  3: {
    '': 'opties/smeernippel-voorzijde',
    N: 'opties/smeernippel-zijkant',
  },
  6: {
    MF: 'opties/smeercontainer-MF',
  },
  8: {
    '1': 'opties/loopwagens-per-rail-1',
    '2': 'opties/loopwagens-per-rail-2',
    '3': 'opties/loopwagens-per-rail-3',
    '4': 'opties/loopwagens-per-rail-4',
  },
  9: {
    // Standaard heeft voorlopig bewust geen foto.
    HT: 'opties/eindplaat-HT',
  },
  10: {
    // Een gewone loopwagen laat de onbehandelde uitvoering zien.
    '': 'loopwagens/SL',
    FCR: 'opties/oppervlak-FCR',
  },
  11: {
    '': 'opties/rail-bovenmontage',
    B: 'opties/rail-draadgaten-onderzijde',
  },
};

export function voegOptieAfbeeldingenToe(root: ParentNode): void {
  for (const [stap, perCode] of Object.entries(PER_STAP)) {
    const raster = root.querySelector(`#step${stap} .option-grid`);
    if (!raster) continue;
    raster.classList.add('met-afbeelding');

    for (const knop of raster.querySelectorAll<HTMLElement>('.opt-btn')) {
      const naam = perCode[codeVan(knop)];
      const src = naam && bestand(naam);
      if (!src) continue;

      const img = document.createElement('img');
      img.className = 'opt-img';
      img.src = src;
      img.alt = '';
      img.width = 320;
      img.height = 320;
      img.decoding = 'async';
      knop.prepend(img);
    }
  }
}
