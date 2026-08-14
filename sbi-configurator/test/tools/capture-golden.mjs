#!/usr/bin/env node
/**
 * Legt het gedrag van het rekenhart van v1.8 vast als golden master.
 *
 * Draai dit ÉÉN keer, vóór de herbouw. Daarna is `test/golden/` de waarheid:
 * de nieuwe implementatie moet exact dezelfde uitvoer produceren. Opnieuw
 * draaien is alleen legitiem als je bewust gedrag verandert — en dan hoort er
 * een regel in docs/decisions.md bij die uitlegt waarom.
 *
 *   npm run golden:capture
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadLegacy, legacyBuildCode, REFERENCE_SHA256 } from './extract-legacy.mjs';
import { canonical, hashSweep } from './canonical.mjs';
import {
  autoGSweep,
  computePartsSweep,
  autoNumPartsSweep,
  boundaryCases,
  suggestionCases,
  buildCodeCases,
} from './sweeps.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = resolve(HERE, '../golden');
mkdirSync(GOLDEN, { recursive: true });

const t0 = Date.now();
const L = loadLegacy();
const RAILS = L.RAILS;

const write = (name, data) => {
  writeFileSync(resolve(GOLDEN, name), data.endsWith('\n') ? data : data + '\n');
};
const writeJson = (name, obj) => write(name, JSON.stringify(obj, null, 2));
const writeJsonl = (name, rows) => write(name, rows.map((r) => JSON.stringify(r)).join('\n'));

console.log('Golden master vastleggen vanuit reference/v1.8.html\n');

// ── 0. De brontabel zelf ────────────────────────────────────────────────────
writeJson('rails.json', {
  _bron: 'reference/v1.8.html regel 2633 (const RAILS), afgeleid uit SBI maatgegevens (absoluut).xlsx',
  _let_op: 'minLast heeft geen aantoonbare bron — zie docs/vragen-aan-MCA.md vraag 2',
  referenceSha256: REFERENCE_SHA256,
  RAILS,
});
console.log('  rails.json                     8 modellen');

// ── 1. cpCalcAutoGDetailed — volledige sweep, elke mm ───────────────────────
{
  const hash = hashSweep(autoGSweep(RAILS), (c) => L.cpCalcAutoGDetailed(c.L, c.F, c.Gmin));
  writeJson('autog.sweep.json', hash);
  console.log(`  autog.sweep.json         ${String(hash.count).padStart(7)} gevallen  ${hash.sha256.slice(0, 12)}…`);

  // Alle gevallen waar de Gmin-terugval toeslaat, plus de eerste/laatste mm per
  // model — dit is het interessante gedrag, expliciet en leesbaar.
  const rows = [];
  for (const c of autoGSweep(RAILS)) {
    const plain = L.cpCalcAutoG(c.L, c.F, c.Gmin);
    const det = L.cpCalcAutoGDetailed(c.L, c.F, c.Gmin);
    const naive = (c.L - Math.floor(c.L / c.F) * c.F) / 2;
    const fallback = naive < c.Gmin;
    if (fallback || c.L <= 102 || c.L >= RAILS[c.size].maxL - 2) {
      rows.push({ size: c.size, L: c.L, G: det.G, n: det.n, plainG: plain, fallback });
    }
  }
  writeJsonl('autog.cases.jsonl', rows);
  console.log(`  autog.cases.jsonl        ${String(rows.length).padStart(7)} gevallen (Gmin-terugval + randen)`);
}

// ── 2. cpComputeParts — grote sweep als hash, grensgevallen leesbaar ────────
{
  const hash = hashSweep(computePartsSweep(RAILS), (c) =>
    L.cpComputeParts(c.L, c.G1, c.G2, c.F, c.K, c.maxL, c.minLast, c.numParts)
  );
  writeJson('parts.sweep.json', hash);
  console.log(`  parts.sweep.json         ${String(hash.count).padStart(7)} gevallen  ${hash.sha256.slice(0, 12)}…  (${hash.nonNull} met oplossing)`);

  const rows = boundaryCases(RAILS).map((c) => ({
    in: c,
    out: L.cpComputeParts(c.L, c.G1, c.G2, c.F, c.K, c.maxL, c.minLast, c.numParts),
  }));
  writeJsonl('parts.cases.jsonl', rows);
  const solved = rows.filter((r) => r.out !== null).length;
  console.log(`  parts.cases.jsonl        ${String(rows.length).padStart(7)} grensgevallen (${solved} met oplossing)`);
}

// ── 3. cpAutoNumParts ───────────────────────────────────────────────────────
{
  const hash = hashSweep(autoNumPartsSweep(RAILS), (c) =>
    L.cpAutoNumParts(c.L, c.G1, c.G2, c.F, c.K, c.maxL, c.minLast)
  );
  writeJson('autonumparts.sweep.json', hash);
  console.log(`  autonumparts.sweep.json  ${String(hash.count).padStart(7)} gevallen  ${hash.sha256.slice(0, 12)}…  (${hash.nonNull} met oplossing)`);
}

// ── 4. cpFindSuggestions — volledige resultaatarrays ────────────────────────
{
  const rows = suggestionCases(RAILS).map((c) => ({
    in: c,
    out: L.cpFindSuggestions(c.L, c.G1, c.G2, c.F, c.K, c.maxL, c.minLast, c.count),
  }));
  writeJsonl('suggestions.cases.jsonl', rows);
  const empty = rows.filter((r) => r.out.length === 0).length;
  console.log(`  suggestions.cases.jsonl  ${String(rows.length).padStart(7)} gevallen (${empty} leeg — zie opmerking hieronder)`);
}

// ── 5. buildCode ────────────────────────────────────────────────────────────
{
  const cases = buildCodeCases(5000);
  const rows = cases.map((sel) => ({ in: sel, out: legacyBuildCode(sel) }));
  writeJsonl('buildcode.cases.jsonl', rows);
  const hash = hashSweep(cases, (sel) => legacyBuildCode(sel));
  writeJson('buildcode.sweep.json', hash);
  console.log(`  buildcode.cases.jsonl    ${String(rows.length).padStart(7)} gevallen  ${hash.sha256.slice(0, 12)}…`);
}

// ── 6. step9FindSuggestions (stap 12 hulpsuggesties) ────────────────────────
{
  const rows = [];
  for (const size of Object.keys(RAILS).map(Number)) {
    const r = RAILS[size];
    for (const L0 of [100, 800, 1234, 2000, 3000, r.maxL - 7, r.maxL]) {
      rows.push({
        in: { size, L: L0, F: r.F, Gmin: r.Gmin, maxL: r.maxL, count: 6 },
        out: L.step9FindSuggestions(L0, r.F, r.Gmin, r.maxL, 6),
      });
    }
  }
  writeJsonl('step9suggestions.cases.jsonl', rows);
  console.log(`  step9suggestions.cases.jsonl ${String(rows.length).padStart(3)} gevallen`);
}

console.log(`\nKlaar in ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
console.log(`Referentie-hash: ${REFERENCE_SHA256}`);
process.exit(0);
