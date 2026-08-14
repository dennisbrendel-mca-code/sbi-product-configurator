/**
 * Definitie van de golden-master sweeps.
 *
 * Dit bestand is met opzet gedeeld tussen het vastleggen van de fixtures
 * (capture-golden.mjs) en het verifiëren ervan (test/domain/*.test.ts). Beide
 * moeten exact dezelfde invoer genereren, anders vergelijk je appels met peren.
 *
 * WIJZIG DIT BESTAND NIET zonder de fixtures opnieuw vast te leggen — dan
 * verandert de betekenis van elke hash.
 */

export const MODELS = [15, 20, 25, 30, 35, 45, 55, 65];

/**
 * Bevroren kopie van de G-formule uit v1.8 (cpCalcAutoG, regel 2748).
 *
 * Wordt UITSLUITEND gebruikt om realistische invoerwaarden te genereren, nooit
 * als orakel — de formule zelf wordt apart getoetst via de autoG-sweep.
 */
export function sweepAutoG(totalLen, F, Gmin) {
  const n = Math.floor(totalLen / F);
  const steekTotal = n * F;
  const G_calc = (totalLen - steekTotal) / 2;
  return G_calc < Gmin ? (totalLen - steekTotal + F) / 2 : G_calc;
}

/**
 * Sweep 1 — cpCalcAutoGDetailed: elke millimeter van 100 t/m maxL, alle modellen.
 * ~30.000 gevallen; volledige dekking van het bereik dat de UI toelaat.
 */
export function* autoGSweep(RAILS) {
  for (const size of MODELS) {
    const r = RAILS[size];
    for (let L = 100; L <= r.maxL; L++) {
      yield { size, L, F: r.F, Gmin: r.Gmin };
    }
  }
}

/**
 * Sweep 2 — cpComputeParts.
 *
 * Twee passes:
 *  A. realistische G (zoals de app hem berekent), lengte tot 3x maxL in stappen
 *     van 13 mm. 13 is priem t.o.v. alle steken F (60/80/105/120/150), zodat de
 *     rest modulo F alle waarden doorloopt in plaats van vast te lopen op één
 *     residu — precies het gedrag waar cpFindSuggestions op stukloopt.
 *  B. vaste G-waarden, inclusief 20 en 22,5 (de bottom-mount waarden uit de
 *     catalogus) zodat die tak vastligt vóórdat we hem ooit aanzetten.
 */
export function* computePartsSweep(RAILS) {
  for (const size of MODELS) {
    const r = RAILS[size];
    const K = r.F / 2;

    for (let L = 100; L <= 3 * r.maxL; L += 13) {
      const G = sweepAutoG(L, r.F, r.Gmin);
      for (let numParts = 1; numParts <= 6; numParts++) {
        yield { size, L, G1: G, G2: G, F: r.F, K, maxL: r.maxL, minLast: r.minLast, numParts };
      }
    }

    for (const G of [r.Gmin, r.Gmin + 7, 20, 22.5]) {
      for (let L = 100; L <= 3 * r.maxL; L += 29) {
        for (let numParts = 1; numParts <= 4; numParts++) {
          yield { size, L, G1: G, G2: G, F: r.F, K, maxL: r.maxL, minLast: r.minLast, numParts };
        }
      }
    }
  }
}

/**
 * Sweep 3 — cpAutoNumParts: zelfde lengtegrid, laat de functie zelf het
 * minimale aantal delen bepalen.
 */
export function* autoNumPartsSweep(RAILS) {
  for (const size of MODELS) {
    const r = RAILS[size];
    const K = r.F / 2;
    for (let L = 100; L <= 3 * r.maxL; L += 13) {
      const G = sweepAutoG(L, r.F, r.Gmin);
      yield { size, L, G1: G, G2: G, F: r.F, K, maxL: r.maxL, minLast: r.minLast };
    }
  }
}

/**
 * Grensgevallen die hoe dan ook expliciet en leesbaar vastgelegd moeten worden.
 * Een falende hash zegt alleen "er is iets veranderd"; deze gevallen laten zien
 * wát er veranderd is.
 */
export function boundaryCases(RAILS) {
  const cases = [];
  for (const size of MODELS) {
    const r = RAILS[size];
    const K = r.F / 2;
    const lengths = [
      100,
      r.minLast - 1, r.minLast, r.minLast + 1,
      Math.ceil(r.minLast), Math.floor(r.minLast),
      r.maxL - 1, r.maxL, r.maxL + 1,
      2 * r.maxL, 2 * r.maxL + 1,
      3 * r.maxL,
      r.F, 2 * r.F, 10 * r.F,          // exact n*F
      2 * r.Gmin, 2 * r.Gmin + r.F,    // exact n*F + 2*Gmin
      r.F - 1, r.F + 1,
      801, 1000, 1234, 2000, 9000, 12000,
    ];
    for (const L of lengths) {
      if (!Number.isFinite(L) || L <= 0) continue;
      const G = sweepAutoG(L, r.F, r.Gmin);
      for (const [G1, G2] of [[G, G], [r.Gmin, r.Gmin], [20, 20], [22.5, 22.5], [r.Gmin, G]]) {
        for (const numParts of [1, 2, 3, 5]) {
          cases.push({ size, L, G1, G2, F: r.F, K, maxL: r.maxL, minLast: r.minLast, numParts });
        }
      }
    }
  }
  return cases;
}

/**
 * Sweep 4 — cpFindSuggestions. Duur (elke aanroep doet ~300x cpComputeParts),
 * dus gestratificeerd in plaats van uitputtend. Volledige resultaatarrays.
 */
export function suggestionCases(RAILS) {
  const cases = [];
  for (const size of MODELS) {
    const r = RAILS[size];
    const K = r.F / 2;
    for (const L of [100, 800, 1234, 2000, 3000, r.maxL - 7, r.maxL, r.maxL + 1, 2 * r.maxL + 13, 9000, 12000]) {
      const G = sweepAutoG(L, r.F, r.Gmin);
      for (const [G1, G2] of [[G, G], [r.Gmin, r.Gmin], [G, r.Gmin]]) {
        cases.push({ size, L, G1, G2, F: r.F, K, maxL: r.maxL, minLast: r.minLast, count: 5 });
      }
    }
  }
  return cases;
}

// ── buildCode ───────────────────────────────────────────────────────────────

/** De keuzemogelijkheden per stap, exact zoals v1.8 ze aanbiedt. */
export const STEP_CHOICES = {
  1: ['SBI15', 'SBI20', 'SBI25', 'SBI30', 'SBI35', 'SBI45', 'SBI55', 'SBI65'],
  2: ['FL', 'FLL', 'FLS', 'SL', 'SLL', 'SLS', 'HL', 'HLS', 'HLL', 'CL', 'CLS', 'CLL', 'FV', 'SV', ''],
  3: ['', 'N'],
  4: ['H', 'P'],
  5: ['K0', 'K1', 'K2', 'K3'],
  6: ['', 'MF'],
  7: ['', 'DD', 'ZZ', 'KK'],
  8: ['1', '2', '3', '4'],
  9: ['', 'HT'],
  10: ['', 'FCR'],
  11: ['', 'B'],
  12: ['100', '800', '1200', '2960', '3960', '9000', '12000'],
  13: ['6/6', '20/20', '30/30', '10.5/10.5', '379.5/379.5'],
  14: ['', 'II', 'III', 'IV'],
  15: ['1', '5', '500'],
};

/** Deterministische PRNG (mulberry32), zodat de fixtures reproduceerbaar zijn. */
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

/**
 * Sweep 5 — buildCode: 5000 willekeurige selectiestaten, inclusief ontbrekende
 * velden (undefined) en lege strings, want juist die bepalen welke velden
 * wegvallen uit de code.
 */
export function buildCodeCases(count = 5000, seed = 20260814) {
  const rnd = mulberry32(seed);
  const steps = Object.keys(STEP_CHOICES).map(Number);
  const cases = [];
  for (let i = 0; i < count; i++) {
    const sel = {};
    for (const s of steps) {
      const roll = rnd();
      if (roll < 0.15) continue; // veld helemaal niet ingevuld
      const opts = STEP_CHOICES[s];
      sel[s] = opts[Math.floor(rnd() * opts.length)];
    }
    cases.push(sel);
  }
  return cases;
}
