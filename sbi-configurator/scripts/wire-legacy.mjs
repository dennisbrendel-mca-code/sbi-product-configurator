#!/usr/bin/env node
/**
 * Bedraadt het legacy UI-script aan de nieuwe domeinlaag.
 *
 * Fase 1 houdt de UI van v1.8 letterlijk intact en vervangt alléén het
 * rekenhart. Dit script knipt de geporteerde functies eruit en zet er thin
 * adapters voor in de plaats die exact dezelfde signatuur hebben, zodat de
 * ~1200 regels UI-code er niets van merken.
 *
 * Waarom een script en geen handwerk: zo is precies aanwijsbaar wát er is
 * weggehaald, en kan het opnieuw als het origineel ooit wijzigt.
 *
 *   node scripts/wire-legacy.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// Leest rechtstreeks uit het bevroren origineel, zodat dit script op zichzelf
// kan draaien zonder tussenbestanden.
const v18 = readFileSync(resolve(ROOT, 'reference/v1.8.html'), 'utf8');
const scriptStart = v18.indexOf('<script>');
const scriptEnd = v18.indexOf('</script>', scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error('Geen <script>-blok in reference/v1.8.html');
let src = v18.slice(scriptStart + '<script>'.length, scriptEnd).trim();

/** Knipt een top-level `function naam(...) { … }` weg, inclusief brace-matching. */
function cutFunction(text, naam) {
  const re = new RegExp(`^([ \\t]*)function\\s+${naam}\\s*\\(`, 'm');
  const m = re.exec(text);
  if (!m) throw new Error(`Functie niet gevonden: ${naam}`);

  const start = m.index;
  let i = text.indexOf('{', start);
  if (i < 0) throw new Error(`Geen body gevonden voor ${naam}`);

  let diepte = 0;
  let inStr = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inLineComment) { if (c === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (c === '*' && next === '/') { inBlockComment = false; i++; } continue; }
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }

    if (c === '{') diepte++;
    else if (c === '}') {
      diepte--;
      if (diepte === 0) {
        const end = i + 1;
        return { text: text.slice(0, start) + text.slice(end), verwijderd: end - start };
      }
    }
  }
  throw new Error(`Ongebalanceerde accolades in ${naam}`);
}

/** Knipt een top-level `const naam = { … };` weg. */
function cutConstObject(text, naam) {
  const re = new RegExp(`^([ \\t]*)const\\s+${naam}\\s*=\\s*\\{`, 'm');
  const m = re.exec(text);
  if (!m) throw new Error(`Constante niet gevonden: ${naam}`);
  const start = m.index;
  let i = text.indexOf('{', start);
  let diepte = 0;
  for (; i < text.length; i++) {
    if (text[i] === '{') diepte++;
    else if (text[i] === '}') {
      diepte--;
      if (diepte === 0) {
        let end = i + 1;
        if (text[end] === ';') end++;
        return { text: text.slice(0, start) + text.slice(end), verwijderd: end - start };
      }
    }
  }
  throw new Error(`Ongebalanceerde accolades in ${naam}`);
}

const teVerwijderen = [
  ['function', 'cpCalcAutoG'],
  ['function', 'cpCalcAutoGDetailed'],
  ['function', 'cpComputeParts'],
  ['function', 'cpAutoNumParts'],
  ['function', 'cpFindSuggestions'],
  ['function', 'step9FindSuggestions'],
  ['function', 'buildCode'],
  ['const', 'RAILS'],
];

const rapport = [];
for (const [soort, naam] of teVerwijderen) {
  const r = soort === 'function' ? cutFunction(src, naam) : cutConstObject(src, naam);
  src = r.text;
  rapport.push(`  − ${naam.padEnd(22)} ${String(r.verwijderd).padStart(5)} tekens`);
}

// De UI roept deze namen aan vanuit 94 inline onclick-attributen. Zolang die er
// staan (fase 2 ruimt ze op) moeten de functies op `window` blijven.
const globalNamen = [
  ...src.matchAll(/^\s{0,8}function\s+([A-Za-z0-9_$]+)/gm),
].map((m) => m[1]);

// De adapters zijn `const`-declaraties en komen dus niet in de regex hierboven
// voor. Ze horen er wél bij: v1.8 had ze als function-declaratie en dus op
// window, en de browser-pariteitstest leest ze daar uit.
const adapterNamen = [
  'RAILS',
  'cpCalcAutoG',
  'cpCalcAutoGDetailed',
  'cpComputeParts',
  'cpAutoNumParts',
  'cpFindSuggestions',
  'step9FindSuggestions',
  'buildCode',
];

const header = `/* eslint-disable */
// @ts-nocheck
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OVERGANGSBESTAND — fase 1
 *
 * Dit is de UI-code van v1.8, letterlijk overgenomen, met één wijziging: het
 * rekenhart is eruit gehaald en vervangen door aanroepen naar \`src/domain\`.
 * Zo staat vast dat de herbouwde berekening zich in de échte applicatie net zo
 * gedraagt als in de tests.
 *
 * Alles wat hier lelijk is — 94 inline onclick-attributen, globale functies,
 * DOM als datastore — is bewust ongemoeid gelaten. Dat is fase 2.
 *
 * GENEREER OPNIEUW MET:  node scripts/wire-legacy.mjs
 * Handmatige wijzigingen in dit bestand gaan bij de volgende run verloren.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { RAILS as DOMAIN_RAILS } from '../domain/catalog.rails';
import { calcAutoG } from '../domain/pitch';
import {
  computeParts,
  autoNumParts,
  findSuggestions,
  findLengthSuggestions,
} from '../domain/coupling';
import { buildOrderCode, fromLegacySelections } from '../domain/ordercode';

// ── Adapters: zelfde signatuur als v1.8, implementatie uit het domein ────────

/** v1.8 las RAILS[20].F etc.; het domein levert dezelfde velden plus \`size\`. */
const RAILS = DOMAIN_RAILS;

const cpCalcAutoG = (totalLen, F, Gmin) => calcAutoG(totalLen, F, Gmin).G;
const cpCalcAutoGDetailed = (totalLen, F, Gmin) => calcAutoG(totalLen, F, Gmin);

const cpComputeParts = (totalLen, G1, G2, F, K, maxL, minLast, numParts) =>
  computeParts({ totalLen, G1, G2, F, K, maxL, minLast }, numParts);

const cpAutoNumParts = (totalLen, G1, G2, F, K, maxL, minLast) =>
  autoNumParts({ totalLen, G1, G2, F, K, maxL, minLast });

const cpFindSuggestions = (desired, G1, G2, F, K, maxL, minLast, count = 5) =>
  findSuggestions({ totalLen: desired, G1, G2, F, K, maxL, minLast }, count);

const step9FindSuggestions = (desired, F, Gmin, maxL, count = 6) =>
  findLengthSuggestions(desired, F, Gmin, maxL, count);

/** v1.8 bouwde de code uit stapnummers; het domein werkt met veldnamen. */
const buildCode = () => buildOrderCode(fromLegacySelections(selections));

// ── Hieronder: ongewijzigde UI-code uit v1.8 ────────────────────────────────

`;

const footer = `

// ── Bedrading naar de inline onclick-attributen ─────────────────────────────
// Vite bundelt naar een module, dus top-level declaraties komen níét meer op
// window terecht. De 94 \`onclick="select(1,…)"\`-attributen in de markup hebben
// ze daar wél nodig. Dit is de brug tot fase 2 ze vervangt door listeners.
Object.assign(window, {
${globalNamen.map((n) => `  ${n},`).join('\n')}
  // Adapters naar src/domain — in v1.8 waren dit gewone globale functies.
${adapterNamen.map((n) => `  ${n},`).join('\n')}
});

// v1.8 hing dit aan DOMContentLoaded, dat níét meer vuurt als de configurator
// later wordt ingevoegd (page builder, AJAX-tab) — daar liep de illustratie op
// leeg. Dit dekt beide gevallen af.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => updateIllustration());
} else {
  updateIllustration();
}
`;

// De oorspronkelijke DOMContentLoaded-listener vervalt door de regel hierboven.
const domReadyRe = /window\.addEventListener\('DOMContentLoaded',[\s\S]*?\}\);\n?/;
if (!domReadyRe.test(src)) throw new Error('DOMContentLoaded-listener niet gevonden');
src = src.replace(domReadyRe, '');

writeFileSync(resolve(ROOT, 'src/ui/legacy-ui.js'), header + src.trim() + footer);

console.log('Uit het legacy-script verwijderd (nu afkomstig uit src/domain):');
console.log(rapport.join('\n'));
console.log(`\n${globalNamen.length} functies opnieuw op window gezet voor de inline handlers.`);
console.log('Geschreven: src/ui/legacy-ui.js');
