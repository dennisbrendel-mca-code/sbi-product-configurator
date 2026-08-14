/**
 * Maakt het rekenhart van v1.8 aanroepbaar vanuit Node, zónder het origineel
 * aan te passen.
 *
 * Dit werkt precies omdát v1.8 al zijn functies op `window` zet. Die 60 globals
 * staan op de opruimlijst, maar hier zijn ze het gereedschap waarmee we bewijzen
 * dat de herbouw zich identiek gedraagt. Pas slopen als de fixtures binnen zijn.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REFERENCE_PATH = resolve(HERE, '../../reference/v1.8.html');

/** SHA-256 van reference/v1.8.html op het moment van bevriezen. */
export const REFERENCE_SHA256 =
  '4419952c52b6547ea4d2bdaea9dbc1bfaa64d935b29dacc8f0381543d52ede9f';

let cached = null;

/**
 * Laadt v1.8 in jsdom en geeft de globale functies terug.
 * Wordt gememoïseerd: het laden kost ~1 s en de functies zijn puur genoeg
 * om te delen (buildCode leest `selections`, dat resetten we per aanroep).
 */
export function loadLegacy() {
  if (cached) return cached;

  const html = readFileSync(REFERENCE_PATH, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://www.mcabv.nl/configurator',
    // Het logo is de enige externe resource; niet ophalen.
    resources: undefined,
  });

  const w = dom.window;

  // `function`-declaraties belanden op window, maar top-level `const` (RAILS,
  // selections, TOTAL_STEPS) leeft in de globale declaratieve scope en staat
  // dáár niet op. Via eval in de window-scope zijn beide bereikbaar — en we
  // krijgen exact dezelfde objectreferentie die buildCode() gebruikt.
  const pick = (name) => {
    const value = w.eval(name);
    if (value === undefined) {
      throw new Error(
        `Legacy-extractie mislukt: '${name}' niet gevonden. ` +
          `Is reference/v1.8.html gewijzigd?`
      );
    }
    return value;
  };

  cached = {
    dom,
    window: w,
    RAILS: pick('RAILS'),
    selections: pick('selections'),
    TOTAL_STEPS: pick('TOTAL_STEPS'),
    buildCode: pick('buildCode'),
    cpCalcAutoG: pick('cpCalcAutoG'),
    cpCalcAutoGDetailed: pick('cpCalcAutoGDetailed'),
    cpComputeParts: pick('cpComputeParts'),
    cpAutoNumParts: pick('cpAutoNumParts'),
    cpFindSuggestions: pick('cpFindSuggestions'),
    step9FindSuggestions: pick('step9FindSuggestions'),
  };
  return cached;
}

/**
 * Roept het legacy `buildCode()` aan met een schone `selections`-staat.
 * `selections` is een `const` object, dus we legen het in plaats van het te
 * vervangen — anders raken we de referentie kwijt die buildCode() sluit.
 */
export function legacyBuildCode(selectionsInput) {
  const { selections, buildCode } = loadLegacy();
  for (const k of Object.keys(selections)) delete selections[k];
  for (const [k, v] of Object.entries(selectionsInput)) {
    if (v !== undefined) selections[k] = v;
  }
  return buildCode();
}

/** Deterministische PRNG, zodat fixtures reproduceerbaar zijn. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
