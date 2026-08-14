#!/usr/bin/env node
/**
 * Haalt de CSS en de markup letterlijk uit reference/v1.8.html.
 *
 * Eenmalig gereedschap voor fase 1/2. Het doel is dat de opmaak *letterlijk*
 * overgaat — geen overtypfouten, geen stille herformattering — zodat een
 * verschil tussen v1.8 en v2 alleen uit de bedrading kan komen.
 *
 * Schrijft:
 *   src/ui/styles/legacy.css   de stylesheet, met de host-regels omgezet
 *   src/ui/legacy-markup.ts    de markup als string, voor in de shadow root
 *   index.html                 een gastpagina die het element plaatst
 *
 * Het JavaScript wordt apart afgehandeld door scripts/wire-legacy.mjs.
 *
 *   node scripts/split-legacy.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const src = readFileSync(resolve(ROOT, 'reference/v1.8.html'), 'utf8');

const between = (openTag, closeTag) => {
  const start = src.indexOf(openTag);
  const end = src.indexOf(closeTag, start);
  if (start < 0 || end < 0) throw new Error(`Niet gevonden: ${openTag} … ${closeTag}`);
  return src.slice(start + openTag.length, end);
};

let css = between('<style>', '</style>').trim();
const body = between('<body>', '</body>')
  .replace(/<script>[\s\S]*?<\/script>/, '')
  .trim();

/**
 * Host-regels omzetten voor de shadow root.
 *
 * Dit is de kern van de isolatie. In v1.8 stonden `:root` en `body` op
 * documentniveau: geplakt in een WordPress-pagina zouden `* { margin:0 }` en
 * `body { background: … }` de hele site slopen. Binnen een shadow root raakt
 * `*` alleen de eigen inhoud, en verwijzen `:host`-regels naar het element zelf.
 */
const cssPatches = [
  { van: ':root {', naar: ':host {', waarom: 'custom properties horen op de host, niet op het document' },
  { van: 'body {', naar: ':host {', waarom: 'achtergrond en tekstkleur gelden voor het element, niet voor de pagina' },
];
for (const p of cssPatches) {
  if (!css.includes(p.van)) throw new Error(`CSS-patch mislukt: "${p.van}" niet gevonden`);
  css = css.replace(p.van, p.naar);
}
css =
  `/* GEGENEREERD door scripts/split-legacy.mjs uit reference/v1.8.html.\n` +
  `   Handmatige wijzigingen gaan bij de volgende run verloren.\n\n` +
  `   Twee selectors zijn omgezet voor de shadow root:\n` +
  cssPatches.map((p) => `     ${p.van.padEnd(8)} -> ${p.naar.padEnd(8)}  (${p.waarom})`).join('\n') +
  `\n\n   De \`*\`-reset mag daardoor blijven staan: binnen een shadow root\n` +
  `   raakt hij alleen de configurator, niet de pagina eromheen. */\n\n` +
  `:host {\n  display: block;\n}\n\n` +
  css;

mkdirSync(resolve(ROOT, 'src/ui/styles'), { recursive: true });
writeFileSync(resolve(ROOT, 'src/ui/styles/legacy.css'), css + '\n');

// De markup gaat als string mee: shadow roots vullen zich niet uit index.html.
const escaped = body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
writeFileSync(
  resolve(ROOT, 'src/ui/legacy-markup.ts'),
  `/* GEGENEREERD door scripts/split-legacy.mjs uit reference/v1.8.html.\n` +
    ` * Handmatige wijzigingen gaan bij de volgende run verloren.\n` +
    ` *\n` +
    ` * De markup van v1.8, letterlijk. Wordt in de shadow root van\n` +
    ` * <mca-sbi-configurator> gezet, zodat de opmaak en de pagina eromheen\n` +
    ` * elkaar niet kunnen raken.\n` +
    ` */\n` +
    `export const LEGACY_MARKUP = \`${escaped}\`;\n`
);

const html = `<!DOCTYPE html>
<html lang="nl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCA – Profielrailgeleiding Configurator</title>
    <!--
      Gastpagina. Dit is met opzet niet meer dan een omhulsel: de configurator
      zit volledig in het custom element hieronder, met eigen shadow root. Zo
      werkt hetzelfde bestand als losse pagina én geplakt in een WordPress- of
      YOOtheme-pagina, zonder dat de stijlen elkaar raken.

      GEGENEREERD met scripts/split-legacy.mjs.
    -->
</head>

<body>
    <mca-sbi-configurator></mca-sbi-configurator>
    <script type="module" src="/src/main.ts"></script>
</body>

</html>
`;
writeFileSync(resolve(ROOT, 'index.html'), html);

const lines = (s) => s.split('\n').length;
console.log('Uit reference/v1.8.html gehaald:');
console.log(`  src/ui/styles/legacy.css   ${String(lines(css)).padStart(5)} regels  (${cssPatches.length} host-selectors omgezet)`);
console.log(`  src/ui/legacy-markup.ts    ${String(lines(body)).padStart(5)} regels markup`);
console.log(`  index.html                 ${String(lines(html)).padStart(5)} regels gastpagina`);
