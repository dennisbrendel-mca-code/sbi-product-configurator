/**
 * Pariteit: het nieuwe domein moet exact hetzelfde doen als v1.8.
 *
 * Dit is de kern van de garantie uit het plan. Zolang deze tests groen zijn, is
 * elke herstructurering aantoonbaar gedragsneutraal.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { hashSweep, canonical } from '../tools/canonical.mjs';
import {
  autoGSweep,
  computePartsSweep,
  autoNumPartsSweep,
  boundaryCases,
  suggestionCases,
  buildCodeCases,
} from '../tools/sweeps.mjs';
import type { PartsCase, SuggestionCase } from '../tools/sweeps.mjs';

import { RAILS } from '../../src/domain/catalog.rails';
import { calcAutoG } from '../../src/domain/pitch';
import { computeParts, autoNumParts, findSuggestions, findLengthSuggestions } from '../../src/domain/coupling';
import type { CouplingInput } from '../../src/domain/coupling';
import { buildOrderCode, fromLegacySelections } from '../../src/domain/ordercode';
import { MODEL_SIZES } from '../../src/domain/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const golden = (name: string) => resolve(HERE, '../golden', name);
const readJson = (name: string) => JSON.parse(readFileSync(golden(name), 'utf8'));
const readJsonl = (name: string) =>
  readFileSync(golden(name), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

/** De sweeps leveren losse velden; het domein werkt met één invoerobject. */
const toInput = (c: Omit<PartsCase, 'numParts'>): CouplingInput => ({
  totalLen: c.L,
  G1: c.G1,
  G2: c.G2,
  F: c.F,
  K: c.K,
  maxL: c.maxL,
  minLast: c.minLast,
});

describe('pariteit — de maattabel', () => {
  it('RAILS komt overeen met de vastgelegde brontabel', () => {
    const fixture = readJson('rails.json').RAILS;
    for (const size of MODEL_SIZES) {
      const rail = RAILS[size];
      expect({ F: rail.F, Gmin: rail.Gmin, maxL: rail.maxL, minLast: rail.minLast }).toEqual(
        fixture[String(size)]
      );
    }
  });

  it('K is exact een halve steek, zodat de gatafstand over een naad F blijft', () => {
    for (const size of MODEL_SIZES) {
      expect(RAILS[size].F / 2 + RAILS[size].F / 2).toBe(RAILS[size].F);
    }
  });
});

describe('pariteit — rekenhart tegen de golden master', () => {
  it('calcAutoG over de volledige sweep (29.888 gevallen)', () => {
    const fixture = readJson('autog.sweep.json');
    const actual = hashSweep(autoGSweep(RAILS), (c: any) => calcAutoG(c.L, c.F, c.Gmin));
    expect(actual.count).toBe(fixture.count);
    expect(actual.sha256).toBe(fixture.sha256);
  });

  it('computeParts over de volledige sweep (92.582 gevallen)', () => {
    const fixture = readJson('parts.sweep.json');
    const actual = hashSweep(computePartsSweep(RAILS), (c: any) => computeParts(toInput(c), c.numParts));
    expect(actual.count).toBe(fixture.count);
    expect(actual.nonNull).toBe(fixture.nonNull);
    expect(actual.sha256).toBe(fixture.sha256);
  });

  it('autoNumParts over de volledige sweep', () => {
    const fixture = readJson('autonumparts.sweep.json');
    const actual = hashSweep(autoNumPartsSweep(RAILS), (c: any) => autoNumParts(toInput(c)));
    expect(actual.count).toBe(fixture.count);
    expect(actual.sha256).toBe(fixture.sha256);
  });

  it('buildOrderCode over 5.000 selectiestaten', () => {
    const fixture = readJson('buildcode.sweep.json');
    const actual = hashSweep(buildCodeCases(5000), (sel: any) =>
      buildOrderCode(fromLegacySelections(sel))
    );
    expect(actual.count).toBe(fixture.count);
    expect(actual.sha256).toBe(fixture.sha256);
  });
});

describe('pariteit — leesbare gevallen, met diagnose bij afwijking', () => {
  it('computeParts grensgevallen', () => {
    const fixture = readJsonl('parts.cases.jsonl');
    const cases = boundaryCases(RAILS);
    expect(fixture.length).toBe(cases.length);

    const afwijkingen: unknown[] = [];
    for (const [i, c] of cases.entries()) {
      const out = computeParts(toInput(c), c.numParts);
      if (canonical(out) !== canonical(fixture[i].out)) {
        afwijkingen.push({ in: c, verwacht: fixture[i].out, kreeg: out });
      }
    }
    expect(afwijkingen).toEqual([]);
  });

  it('findSuggestions', () => {
    const fixture = readJsonl('suggestions.cases.jsonl');
    const cases = suggestionCases(RAILS);
    expect(fixture.length).toBe(cases.length);

    const afwijkingen: unknown[] = [];
    for (const [i, c] of (cases as SuggestionCase[]).entries()) {
      const out = findSuggestions(toInput(c), c.count);
      if (canonical(out) !== canonical(fixture[i].out)) {
        afwijkingen.push({ in: c, verwacht: fixture[i].out, kreeg: out });
      }
    }
    expect(afwijkingen).toEqual([]);
  });

  it('findLengthSuggestions (stap 12)', () => {
    const fixture = readJsonl('step9suggestions.cases.jsonl');
    const afwijkingen: unknown[] = [];
    for (const row of fixture) {
      const c = row.in;
      const out = findLengthSuggestions(c.L, c.F, c.Gmin, c.maxL, c.count);
      if (canonical(out) !== canonical(row.out)) {
        afwijkingen.push({ in: c, verwacht: row.out, kreeg: out });
      }
    }
    expect(afwijkingen).toEqual([]);
  });

  it('buildOrderCode', () => {
    const fixture = readJsonl('buildcode.cases.jsonl');
    const afwijkingen: unknown[] = [];
    for (const row of fixture) {
      const out = buildOrderCode(fromLegacySelections(row.in));
      if (out !== row.out) afwijkingen.push({ in: row.in, verwacht: row.out, kreeg: out });
    }
    expect(afwijkingen).toEqual([]);
  });
});

describe('eigenschappen die altijd moeten gelden', () => {
  /** Alle geldige verdelingen uit de grote sweep, één keer verzameld. */
  const verdelingen = (() => {
    const out: { c: any; parts: NonNullable<ReturnType<typeof computeParts>> }[] = [];
    for (const c of computePartsSweep(RAILS) as Iterable<any>) {
      const parts = computeParts(toInput(c), c.numParts);
      if (parts) out.push({ c, parts });
    }
    return out;
  })();

  it('er zijn genoeg geldige verdelingen om iets te bewijzen', () => {
    expect(verdelingen.length).toBeGreaterThan(10_000);
  });

  it('de deellengtes sommeren exact tot de gevraagde lengte', () => {
    for (const { c, parts } of verdelingen) {
      const som = parts.reduce((a, p) => a + p.L, 0);
      expect(Math.abs(som - c.L)).toBeLessThan(1e-9);
    }
  });

  it('geen enkel deel is langer dan de handelslengte', () => {
    for (const { c, parts } of verdelingen) {
      for (const p of parts) expect(p.L).toBeLessThanOrEqual(c.maxL);
    }
  });

  it('het laatste deel haalt de minimale zaaglengte', () => {
    for (const { c, parts } of verdelingen) {
      expect(parts[parts.length - 1]!.L).toBeGreaterThanOrEqual(c.minLast);
    }
  });

  it('de gatafstand over elke koppeling heen is exact één steek', () => {
    // Dit is precies wat de xlsx-kolom "Steek F bij koppelpunten" eist.
    for (const { c, parts } of verdelingen) {
      for (let i = 0; i < parts.length - 1; i++) {
        const overgang = parts[i]!.gEnd + parts[i + 1]!.gStart;
        expect(Math.abs(overgang - c.F)).toBeLessThan(1e-9);
      }
    }
  });

  it('elk deel klopt intern: gStart + n*F + gEnd === L', () => {
    for (const { c, parts } of verdelingen) {
      for (const p of parts) {
        expect(Math.abs(p.gStart + p.n * c.F + p.gEnd - p.L)).toBeLessThan(1e-9);
      }
    }
  });

  it('automatische G haalt altijd de minimale eindmaat', () => {
    for (const size of MODEL_SIZES) {
      const r = RAILS[size];
      for (let L = 100; L <= r.maxL; L += 7) {
        expect(calcAutoG(L, r.F, r.Gmin).G).toBeGreaterThanOrEqual(r.Gmin);
      }
    }
  });
});
