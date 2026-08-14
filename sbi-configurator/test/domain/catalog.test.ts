/**
 * De datalaag moet exact aanbieden wat v1.8 aanbood.
 *
 * `test/golden/ui-options.json` is uit het bevroren origineel gelezen (met
 * `scripts/extract-options.mjs`) en bevat elke stap, elke optie, elke code,
 * elk label en elke maatbeperking. Deze tests leggen ernaast wat de
 * handgeschreven datalaag oplevert. Zo kan er bij het omzetten van HTML naar
 * data niets stilletjes wegvallen of verschuiven.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { VELDEN, AANTAL_STAPPEN, STAPPEN_ZONDER_LOOPWAGEN } from '../../src/domain/catalog.fields';
import type { KeuzeVeld, GetalVeld, SteekVeld } from '../../src/domain/catalog.fields';
import { BLOCK_TYPES, isLeverbaar, nietLeverbaarVoor } from '../../src/domain/catalog.blocks';
import { ORDER_CODE_FIELDS, MODEL_SIZES } from '../../src/domain/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(
  readFileSync(resolve(HERE, '../golden/ui-options.json'), 'utf8')
) as {
  stappen: {
    id: string;
    titel: string;
    omschrijving: string;
    opties: {
      code: string | null;
      optCode: string | null;
      optLabel: string | null;
      models: number[] | null;
      bijzonder: string | null;
    }[];
    invoer: { id: string; min: string | null; max: string | null; value: string | null }[];
  }[];
  defaults: { step: number; idx: number }[];
};

const goldenStap = (n: number) => golden.stappen.find((s) => s.id === `step${n}`)!;
/** De skip-knop van stap 2 is geen gewone optie; die telt apart. */
const gewoneOpties = (n: number) => goldenStap(n).opties.filter((o) => o.code !== null);

describe('datalaag — dekt exact de stappen van v1.8', () => {
  it('vijftien stappen, met dezelfde nummering', () => {
    expect(AANTAL_STAPPEN).toBe(15);
    expect(VELDEN.map((v) => v.stap)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it('elk veld heeft de titel uit v1.8', () => {
    for (const veld of VELDEN) {
      expect(goldenStap(veld.stap).titel).toBe(veld.titel);
    }
  });

  it('elk veld heeft de omschrijving uit v1.8', () => {
    // Zonder deze test glipt er makkelijk een zelfbedachte formulering in die
    // nét iets anders belooft dan MCA heeft opgeschreven.
    const afwijkingen: unknown[] = [];
    for (const veld of VELDEN) {
      const oud = goldenStap(veld.stap).titel === veld.titel ? goldenStap(veld.stap) : null;
      if (!oud) continue;
      if (oud.omschrijving !== veld.omschrijving) {
        afwijkingen.push({ stap: veld.stap, nieuw: veld.omschrijving, oud: oud.omschrijving });
      }
    }
    expect(afwijkingen).toEqual([]);
  });

  it('de veertien codevelden komen precies één keer voor', () => {
    const idsInWizard = VELDEN.map((v) => v.id);
    for (const field of ORDER_CODE_FIELDS) {
      expect(idsInWizard.filter((id) => id === field)).toHaveLength(1);
    }
    // Stap 15 hoort er wel bij in de wizard maar niet in de code.
    expect(idsInWizard).toContain('aantalConfiguraties');
    expect(ORDER_CODE_FIELDS as readonly string[]).not.toContain('aantalConfiguraties');
  });
});

describe('datalaag — keuzes komen overeen met v1.8', () => {
  const keuzeVelden = VELDEN.filter((v): v is KeuzeVeld => v.soort === 'keuze');

  it('elk keuzeveld heeft evenveel opties als v1.8', () => {
    for (const veld of keuzeVelden) {
      expect({ stap: veld.stap, aantal: veld.keuzes.length }).toEqual({
        stap: veld.stap,
        aantal: gewoneOpties(veld.stap).length,
      });
    }
  });

  it('codes, badges en labels zijn letterlijk gelijk', () => {
    const afwijkingen: unknown[] = [];
    for (const veld of keuzeVelden) {
      const oud = gewoneOpties(veld.stap);
      veld.keuzes.forEach((keuze, i) => {
        const o = oud[i];
        if (!o) return;
        if (keuze.code !== o.code) afwijkingen.push({ stap: veld.stap, i, veld: 'code', nieuw: keuze.code, oud: o.code });
        if (keuze.badge !== o.optCode) afwijkingen.push({ stap: veld.stap, i, veld: 'badge', nieuw: keuze.badge, oud: o.optCode });
        if (keuze.label !== o.optLabel) afwijkingen.push({ stap: veld.stap, i, veld: 'label', nieuw: keuze.label, oud: o.optLabel });
      });
    }
    expect(afwijkingen).toEqual([]);
  });

  it('de maatbeperkingen zijn ongewijzigd overgenomen', () => {
    // MCA (vraag 6): laten zoals het is. Alleen FLS/SLS/HLS en CLS zijn beperkt.
    const beperkt = BLOCK_TYPES.filter((b) => b.models !== null);
    expect(beperkt.map((b) => b.code)).toEqual(['FLS', 'SLS', 'HLS', 'CLS']);
    expect(beperkt.find((b) => b.code === 'FLS')!.models).toEqual([15, 20, 25, 30, 35]);
    expect(beperkt.find((b) => b.code === 'CLS')!.models).toEqual([20]);

    // …en dat is precies wat er in de markup van v1.8 stond.
    const uitGolden = goldenStap(2)
      .opties.filter((o) => o.models !== null)
      .map((o) => ({ code: o.code, models: o.models }));
    expect(uitGolden).toEqual(beperkt.map((b) => ({ code: b.code, models: [...b.models!] })));
  });

  it('stap 2 heeft de "geen loopwagen"-route', () => {
    const stap2 = keuzeVelden.find((v) => v.stap === 2)!;
    expect(stap2.uitzondering?.actie).toBe('geenLoopwagen');
    expect(goldenStap(2).opties.some((o) => o.bijzonder === 'selectNoCarriage')).toBe(true);
  });

  it('de voorselecties wijzen dezelfde opties aan als v1.8', () => {
    for (const { step, idx } of golden.defaults) {
      const veld = VELDEN.find((v) => v.stap === step);
      expect(veld, `stap ${step} ontbreekt in de datalaag`).toBeDefined();
      expect((veld as KeuzeVeld).standaardIndex, `stap ${step}`).toBe(idx);
    }
    // …en geen enkel ánder veld heeft er stiekem een.
    const metStandaard = VELDEN.filter((v) => v.soort === 'keuze' && v.standaardIndex !== undefined).map((v) => v.stap);
    expect(metStandaard.sort((a, b) => a - b)).toEqual(golden.defaults.map((d) => d.step).sort((a, b) => a - b));
  });
});

describe('datalaag — getalvelden komen overeen met v1.8', () => {
  it('raillengte: min 100, max 12000', () => {
    const veld = VELDEN.find((v) => v.id === 'railLength') as GetalVeld;
    const invoer = goldenStap(12).invoer.find((i) => i.id === 'lengthInput')!;
    expect(String(veld.min)).toBe(invoer.min);
    expect(String(veld.max)).toBe(invoer.max);
  });

  it('aantal configuraties: min 1, max 500, standaard 1', () => {
    const veld = VELDEN.find((v) => v.id === 'aantalConfiguraties') as GetalVeld;
    const invoer = goldenStap(15).invoer.find((i) => i.id === 'qtyInput')!;
    expect(String(veld.min)).toBe(invoer.min);
    expect(String(veld.max)).toBe(invoer.max);
    expect(String(veld.standaard)).toBe(invoer.value);
  });

  it('steek: min 5, max 200 op beide velden', () => {
    const veld = VELDEN.find((v) => v.id === 'pitch') as SteekVeld;
    for (const id of ['pitchFirst', 'pitchLast']) {
      const invoer = goldenStap(13).invoer.find((i) => i.id === id)!;
      expect(String(veld.min)).toBe(invoer.min);
      expect(String(veld.max)).toBe(invoer.max);
    }
  });
});

describe('datalaag — eigenschappen die de UI erop mag bouwen', () => {
  it('elke code komt hoogstens één keer voor binnen een veld', () => {
    for (const veld of VELDEN) {
      if (veld.soort !== 'keuze') continue;
      const codes = veld.keuzes.map((k) => k.code);
      expect(new Set(codes).size, `stap ${veld.stap}`).toBe(codes.length);
    }
  });

  it('hoogstens één "geen symbool" per veld', () => {
    for (const veld of VELDEN) {
      if (veld.soort !== 'keuze') continue;
      expect(veld.keuzes.filter((k) => k.code === '').length, `stap ${veld.stap}`).toBeLessThanOrEqual(1);
    }
  });

  it('een standaardIndex wijst altijd naar een bestaande optie', () => {
    for (const veld of VELDEN) {
      if (veld.soort !== 'keuze' || veld.standaardIndex === undefined) continue;
      expect(veld.keuzes[veld.standaardIndex], `stap ${veld.stap}`).toBeDefined();
    }
  });

  it('de filtering per maat levert dezelfde uitkomst als v1.8', () => {
    // v1.8: FLS/SLS/HLS weg boven maat 35, CLS weg bij alles behalve 20.
    const verwacht: Record<number, string[]> = {
      15: ['CLS'], 20: [], 25: ['CLS'], 30: ['CLS'], 35: ['CLS'],
      45: ['FLS', 'SLS', 'HLS', 'CLS'],
      55: ['FLS', 'SLS', 'HLS', 'CLS'],
      65: ['FLS', 'SLS', 'HLS', 'CLS'],
    };
    for (const size of MODEL_SIZES) {
      expect(nietLeverbaarVoor(size).map((b) => b.code), `SBI${size}`).toEqual(verwacht[size]);
    }
  });

  it('zonder gekozen maat is alles leverbaar', () => {
    expect(nietLeverbaarVoor(null)).toEqual([]);
    for (const b of BLOCK_TYPES) expect(isLeverbaar(b, null)).toBe(true);
  });

  it('de "geen loopwagen"-route slaat dezelfde stappen over als v1.8', () => {
    expect([...STAPPEN_ZONDER_LOOPWAGEN]).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });
});
