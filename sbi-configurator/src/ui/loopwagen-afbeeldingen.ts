/**
 * Productfoto's bij de loopwagenkeuze in stap 2.
 *
 * De markup van v1.8 is gegenereerd en wordt niet met de hand aangepast; de
 * foto's worden daarom ná het opbouwen van de shadow root in de knoppen gezet.
 * De knoppen zelf, hun `onclick` en hun tekst blijven ongewijzigd, zodat de
 * logica en de pariteitstests er niets van merken.
 *
 * Bron: de PNG's in `Bron bestanden/loopwagens/`, omgezet naar WebP van
 * 320 × 320 px. Door `assetsInlineLimit` gaan ze als data-URI mee in het ene
 * HTML-bestand.
 */
const BESTANDEN = import.meta.glob<string>('./afbeeldingen/loopwagens/*.webp', {
  eager: true,
  import: 'default',
});

/** Code → afbeelding, afgeleid uit de bestandsnaam (`FL.webp` → `FL`). */
const PER_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(BESTANDEN).map(([pad, url]) => [pad.replace(/^.*\/|\.webp$/g, ''), url]),
);

/** Codes zonder eigen foto, met de foto die ervoor in de plaats komt. */
const VERVANGEND: Record<string, string> = {
  // Geen aparte foto aangeleverd; op verzoek wordt die van HL getoond.
  HLL: 'HL',
};

export function loopwagenAfbeelding(code: string): string | undefined {
  return PER_CODE[code] ?? PER_CODE[VERVANGEND[code] ?? ''];
}

export function voegLoopwagenAfbeeldingenToe(root: ParentNode): void {
  const raster = root.querySelector('#step2 .option-grid');
  if (!raster) return;
  raster.classList.add('met-afbeelding');

  for (const knop of raster.querySelectorAll<HTMLElement>('.opt-btn')) {
    const code = knop.querySelector('.opt-code')?.textContent?.trim() ?? '';
    const src = loopwagenAfbeelding(code);
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
