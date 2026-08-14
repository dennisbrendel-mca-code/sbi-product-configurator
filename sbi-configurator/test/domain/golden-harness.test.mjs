/**
 * Bewaakt de golden master zelf.
 *
 * Dit toetst nog geen nieuwe code — dat begint in fase 1. Wat het hier bewijst
 * is dat het harnas deugt: het origineel is niet gewijzigd, de sweeps zijn
 * deterministisch, en de vastgelegde hashes horen echt bij dit bestand. Zonder
 * dat bewijs is elke latere "de golden test is groen" niets waard.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { loadLegacy, legacyBuildCode, REFERENCE_PATH, REFERENCE_SHA256 } from '../tools/extract-legacy.mjs';
import { hashSweep, canonical } from '../tools/canonical.mjs';
import {
  MODELS,
  autoGSweep,
  computePartsSweep,
  autoNumPartsSweep,
  boundaryCases,
  suggestionCases,
  buildCodeCases,
} from '../tools/sweeps.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const golden = (name) => resolve(HERE, '../golden', name);
const readJson = (name) => JSON.parse(readFileSync(golden(name), 'utf8'));
const readJsonl = (name) =>
  readFileSync(golden(name), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

describe('golden master — integriteit van het harnas', () => {
  it('reference/v1.8.html is ongewijzigd', () => {
    const sha = createHash('sha256').update(readFileSync(REFERENCE_PATH)).digest('hex');
    expect(sha).toBe(REFERENCE_SHA256);
  });

  it('de RAILS-tabel is exact wat we verwachten', () => {
    const { RAILS } = loadLegacy();
    // Letterlijk uitgeschreven, zodat een wijziging altijd bewust is.
    expect(RAILS).toEqual({
      15: { F: 60, Gmin: 6, maxL: 2960, minLast: 216 },
      20: { F: 60, Gmin: 7, maxL: 3960, minLast: 217 },
      25: { F: 60, Gmin: 8, maxL: 3960, minLast: 218 },
      30: { F: 80, Gmin: 9, maxL: 3960, minLast: 289 },
      35: { F: 80, Gmin: 9, maxL: 3960, minLast: 289 },
      45: { F: 105, Gmin: 12, maxL: 3960, minLast: 379.5 },
      55: { F: 120, Gmin: 14, maxL: 3960, minLast: 434 },
      65: { F: 150, Gmin: 15, maxL: 3960, minLast: 540 },
    });
    expect(Object.keys(RAILS).map(Number)).toEqual(MODELS);
  });
});

describe('golden master — sweeps zijn reproduceerbaar', () => {
  it('cpCalcAutoGDetailed', () => {
    const L = loadLegacy();
    const fixture = readJson('autog.sweep.json');
    const actual = hashSweep(autoGSweep(L.RAILS), (c) => L.cpCalcAutoGDetailed(c.L, c.F, c.Gmin));
    expect(actual.count).toBe(fixture.count);
    expect(actual.sha256).toBe(fixture.sha256);
  });

  it('cpComputeParts', () => {
    const L = loadLegacy();
    const fixture = readJson('parts.sweep.json');
    const actual = hashSweep(computePartsSweep(L.RAILS), (c) =>
      L.cpComputeParts(c.L, c.G1, c.G2, c.F, c.K, c.maxL, c.minLast, c.numParts)
    );
    expect(actual.count).toBe(fixture.count);
    expect(actual.nonNull).toBe(fixture.nonNull);
    expect(actual.sha256).toBe(fixture.sha256);
  });

  it('cpAutoNumParts', () => {
    const L = loadLegacy();
    const fixture = readJson('autonumparts.sweep.json');
    const actual = hashSweep(autoNumPartsSweep(L.RAILS), (c) =>
      L.cpAutoNumParts(c.L, c.G1, c.G2, c.F, c.K, c.maxL, c.minLast)
    );
    expect(actual.count).toBe(fixture.count);
    expect(actual.sha256).toBe(fixture.sha256);
  });

  it('buildCode', () => {
    const fixture = readJson('buildcode.sweep.json');
    const actual = hashSweep(buildCodeCases(5000), (sel) => legacyBuildCode(sel));
    expect(actual.count).toBe(fixture.count);
    expect(actual.sha256).toBe(fixture.sha256);
  });
});

describe('golden master — leesbare gevallen kloppen stuk voor stuk', () => {
  it('cpComputeParts grensgevallen', () => {
    const L = loadLegacy();
    const fixture = readJsonl('parts.cases.jsonl');
    const cases = boundaryCases(L.RAILS);
    expect(fixture.length).toBe(cases.length);

    const afwijkingen = [];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const out = L.cpComputeParts(c.L, c.G1, c.G2, c.F, c.K, c.maxL, c.minLast, c.numParts);
      if (canonical(out) !== canonical(fixture[i].out)) {
        afwijkingen.push({ in: c, verwacht: fixture[i].out, kreeg: out });
      }
    }
    expect(afwijkingen).toEqual([]);
  });

  it('cpFindSuggestions', () => {
    const L = loadLegacy();
    const fixture = readJsonl('suggestions.cases.jsonl');
    const cases = suggestionCases(L.RAILS);
    expect(fixture.length).toBe(cases.length);

    const afwijkingen = [];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const out = L.cpFindSuggestions(c.L, c.G1, c.G2, c.F, c.K, c.maxL, c.minLast, c.count);
      if (canonical(out) !== canonical(fixture[i].out)) {
        afwijkingen.push({ in: c, verwacht: fixture[i].out.length, kreeg: out.length });
      }
    }
    expect(afwijkingen).toEqual([]);
  });

  it('buildCode', () => {
    const fixture = readJsonl('buildcode.cases.jsonl');
    const afwijkingen = [];
    for (const row of fixture) {
      const out = legacyBuildCode(row.in);
      if (out !== row.out) afwijkingen.push({ in: row.in, verwacht: row.out, kreeg: out });
    }
    expect(afwijkingen).toEqual([]);
  });
});

describe('bevindingen uit fase 0 — vastgelegd zodat ze niet stilletjes verdwijnen', () => {
  // V-001: zie docs/decisions.md
  it('V-001 · cpFindSuggestions geeft bij SBI30/35/45/65 nooit een resultaat', () => {
    const L = loadLegacy();
    const uitgelijnd = {};
    const werkt = {};
    for (const size of MODELS) {
      const r = L.RAILS[size];
      uitgelijnd[size] = (r.maxL * 3) % r.F === 0;
      const G = L.cpCalcAutoG(1234, r.F, r.Gmin);
      werkt[size] = L.cpFindSuggestions(1234, G, G, r.F, r.F / 2, r.maxL, r.minLast, 5).length > 0;
    }

    expect(uitgelijnd).toEqual({
      15: true, 20: true, 25: true, 30: false,
      35: false, 45: false, 55: true, 65: false,
    });
    // De uitlijning voorspelt exact of de functie iets vindt.
    expect(werkt).toEqual(uitgelijnd);
  });

  // V-003
  it('V-003 · cpCalcAutoG en cpCalcAutoGDetailed zijn identiek over de hele sweep', () => {
    const L = loadLegacy();
    let verschillen = 0;
    for (const c of autoGSweep(L.RAILS)) {
      if (Math.abs(L.cpCalcAutoG(c.L, c.F, c.Gmin) - L.cpCalcAutoGDetailed(c.L, c.F, c.Gmin).G) > 1e-12) {
        verschillen++;
      }
    }
    expect(verschillen).toBe(0);
  });

  // V-004 + V-005
  it('V-004/V-005 · n wordt nooit negatief, maar wél 157x nul', () => {
    const L = loadLegacy();
    let negatief = 0;
    let nul = 0;
    for (const c of autoGSweep(L.RAILS)) {
      const n = L.cpCalcAutoGDetailed(c.L, c.F, c.Gmin).n;
      if (n < 0) negatief++;
      if (n === 0) nul++;
    }
    expect(negatief).toBe(0);
    expect(nul).toBe(157);
  });
});
