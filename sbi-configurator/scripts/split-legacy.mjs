#!/usr/bin/env node
/**
 * Haalt de CSS en de markup letterlijk uit reference/v1.8.html.
 *
 * Eenmalig gereedschap voor fase 1. Het doel is dat de opmaak *letterlijk*
 * overgaat — geen overtypfouten, geen stille herformattering — zodat een
 * verschil tussen v1.8 en v2.0 alleen uit de bedrading kan komen.
 *
 * Schrijft:
 *   src/ui/styles/legacy.css   de volledige stylesheet
 *   index.html                 de markup, met verwijzing naar src/main.ts
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

const css = between('<style>', '</style>').trim();
const body = between('<body>', '</body>')
  .replace(/<script>[\s\S]*?<\/script>/, '')
  .trim();

mkdirSync(resolve(ROOT, 'src/ui/styles'), { recursive: true });
writeFileSync(resolve(ROOT, 'src/ui/styles/legacy.css'), css + '\n');

const html = `<!DOCTYPE html>
<html lang="nl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCA – Profielrailgeleiding Configurator</title>
    <!--
      Fase 1: de markup van v1.8, letterlijk overgenomen. Alleen de bedrading is
      nieuw — CSS en JS komen uit src/ en worden door Vite tot één zelfstandig
      HTML-bestand gebundeld.

      GEGENEREERD met scripts/split-legacy.mjs — handmatige wijzigingen gaan bij
      de volgende run verloren.
    -->
</head>

<body>
${body}
    <script type="module" src="/src/main.ts"></script>
</body>

</html>
`;
writeFileSync(resolve(ROOT, 'index.html'), html);

const lines = (s) => s.split('\n').length;
console.log('Uit reference/v1.8.html gehaald:');
console.log(`  src/ui/styles/legacy.css   ${String(lines(css)).padStart(5)} regels`);
console.log(`  index.html                 ${String(lines(html)).padStart(5)} regels`);
