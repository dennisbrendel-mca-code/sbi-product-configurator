/**
 * Past de regels uit `domain/regels.ts` toe op de knoppen.
 *
 * Na elke klik in de configurator wordt opnieuw bekeken welke opties niet
 * meer mogen. Die worden uitgeschakeld, met de reden erbij. Stond er al een
 * uitgesloten optie gekozen (de klant kiest MF in stap 6 en pas daarna HT in
 * stap 9), dan wordt die vervangen door de eerste toegestane optie en krijgt
 * de klant daar een melding van.
 *
 * De toestand wordt uit de knoppen gelezen (`.selected`), niet uit de
 * variabelen van de v1.8-code. Daardoor volgt dit vanzelf ook wat die code
 * zelf terugzet, zoals bij "geen loopwagen".
 */
import { UITSLUITINGEN, isToegestaan, type Keuzes } from '../domain/regels';
import { codeVan, knoppenVan } from './opt-knop';

const BETROKKEN_STAPPEN = [
  ...new Set(UITSLUITINGEN.flatMap((r) => [r.als.stap, r.stap])),
];

function leesKeuzes(root: ParentNode): Keuzes {
  const keuzes: Record<number, string> = {};
  for (const stap of BETROKKEN_STAPPEN) {
    const gekozen = knoppenVan(root, stap).find((k) => k.classList.contains('selected'));
    if (gekozen) keuzes[stap] = codeVan(gekozen);
  }
  return keuzes;
}

/** Een meldingsvak direct onder het optieraster van een stap. */
function melding(root: ParentNode, stap: number): HTMLElement | null {
  const raster = root.querySelector(`#step${stap} .option-grid`);
  if (!raster) return null;
  let vak = root.querySelector<HTMLElement>(`#uitsluiting${stap}`);
  if (!vak) {
    vak = document.createElement('div');
    vak.id = `uitsluiting${stap}`;
    vak.className = 'wizard-info-box uitsluiting-melding';
    vak.hidden = true;
    raster.before(vak);
  }
  return vak;
}

type Select = (stap: number, code: string, label: string, knop: HTMLElement) => void;

/**
 * Kiest via de `select` van v1.8, zodat labels, bestelcode, zijbalk en
 * illustratie op de gewone manier bijwerken.
 */
function kies(stap: number, code: string, label: string, knop: HTMLElement): void {
  ((window as unknown as { select: Select }).select)(stap, code, label, knop);
}

/** Voorkomt dat de klikken die `werkBij` zelf doet een tweede ronde starten. */
let bezig = false;

function werkBij(root: ParentNode): void {
  if (bezig) return;
  bezig = true;
  try {
    pasToe(root);
  } finally {
    bezig = false;
  }
}

function pasToe(root: ParentNode): void {
  const keuzes = leesKeuzes(root);
  /** Per veroorzakende stap: de stappen waarvan een keuze is vervangen. */
  const aangepast = new Map<number, number[]>();
  const meld = (oorzaak: number, stap: number) =>
    aangepast.set(oorzaak, [...(aangepast.get(oorzaak) ?? []), stap]);

  for (const stap of new Set(UITSLUITINGEN.map((r) => r.stap))) {
    const knoppen = knoppenVan(root, stap);
    const kaart = root.querySelector<HTMLElement>(`#step${stap}`);
    const regel = UITSLUITINGEN.find(
      (r) => r.stap === stap && keuzes[r.als.stap] === r.als.code,
    );
    const gekozen = knoppen.find((k) => k.classList.contains('selected'));

    const vak = melding(root, stap);
    if (vak) {
      vak.hidden = !regel;
      vak.textContent = regel?.reden ?? '';
    }

    // ── Stap vervalt (alle opties uitgesloten) ──────────────────────────
    if (regel?.vervaltAls !== undefined) {
      if (kaart && !kaart.dataset['vervallen'] && knoppen[0]) {
        if (gekozen && codeVan(gekozen) !== '') meld(regel.als.stap, stap);
        kies(stap, '', regel.vervaltAls, knoppen[0]);
        knoppen.forEach((k) => k.classList.remove('selected'));
        const zijbalk = root.querySelector(`#bd${stap}`);
        if (zijbalk) zijbalk.textContent = 'Geen';
        kaart.dataset['vervallen'] = '1';
      }
      for (const knop of knoppen) {
        knop.disabled = true;
        knop.classList.add('opt-uitgesloten');
      }
      continue;
    }

    // Regel vervallen: de stap komt terug. Koos de klant zelf een andere
    // eindplaat, dan op de standaardoptie; is de keuze leeggemaakt (zoals bij
    // "geen loopwagen"), dan laat v1.8 de stap zelf zien zoals het hoort.
    if (kaart?.dataset['vervallen']) {
      delete kaart.dataset['vervallen'];
      for (const knop of knoppen) knop.disabled = false;
      const oorzaken = UITSLUITINGEN.filter((r) => r.stap === stap).map((r) => r.als.stap);
      if (oorzaken.some((o) => keuzes[o] !== undefined)) {
        knoppen.find((k) => codeVan(k) === '')?.click();
      }
    }

    // ── Losse opties uitgesloten ────────────────────────────────────────
    for (const knop of knoppen) {
      const mag = isToegestaan(stap, codeVan(knop), keuzes);
      knop.disabled = !mag;
      knop.classList.toggle('opt-uitgesloten', !mag);
    }

    if (regel && gekozen?.disabled) {
      knoppen.find((k) => !k.disabled)?.click();
      meld(regel.als.stap, stap);
    }
  }

  // Melding bij de stap die de aanpassing veroorzaakte. Blijft staan tot de
  // klant daar iets anders kiest.
  for (const [oorzaak, stappen] of aangepast) {
    const vak = melding(root, oorzaak);
    if (!vak) continue;
    vak.hidden = false;
    vak.textContent =
      `Uw keuze bij stap ${stappen.join(' en ')} is aangepast: ` +
      `die is niet te combineren met deze optie.`;
  }
}

export function bewaakUitsluitingen(root: ShadowRoot): void {
  // Melding bij de veroorzakende stap verdwijnt zodra daar opnieuw gekozen wordt.
  const veroorzakers = new Set(UITSLUITINGEN.map((r) => r.als.stap));
  root.addEventListener('click', (e) => {
    const knop = (e.target as Element | null)?.closest('.opt-btn');
    for (const stap of veroorzakers) {
      if (knop && root.querySelector(`#step${stap}`)?.contains(knop)) {
        const vak = root.querySelector<HTMLElement>(`#uitsluiting${stap}`);
        if (vak) vak.hidden = true;
      }
    }
    werkBij(root);
  });
  werkBij(root);
}
