import type { AutoG } from './types';

/**
 * Berekent de eindmaat G (hartafstand rand → eerste/laatste gat) die het
 * gatpatroon symmetrisch over de rail verdeelt.
 *
 * Verdeel de lengte in zoveel mogelijk hele steken F; wat overblijft valt
 * gelijk aan beide uiteinden. Wordt die rest kleiner dan de minimaal
 * toegestane eindmaat, laat dan één steek vallen — dan wordt G juist een halve
 * steek gróter in plaats van te klein.
 *
 * Verbatim geport uit v1.8 `cpCalcAutoGDetailed` (regel 2757).
 *
 * v1.8 had hier twee functies: `cpCalcAutoG` (regel 2748) rekende bij terugval
 * `(L − n·F + F)/2`, `cpCalcAutoGDetailed` rekende `(L − (n−1)·F)/2`. Dat is
 * algebraïsch hetzelfde; gemeten over alle 29.888 gevallen van de golden sweep
 * geven ze 0 verschillen (zie docs/decisions.md V-003). Daarom hier één functie.
 *
 * @param totalLen  Totale raillengte [mm]
 * @param F         Steek [mm]
 * @param Gmin      Minimaal toegestane eindmaat [mm]
 */
export function calcAutoG(totalLen: number, F: number, Gmin: number): AutoG {
  const n0 = Math.floor(totalLen / F);
  const G_calc = (totalLen - n0 * F) / 2;
  if (G_calc < Gmin) {
    const n1 = n0 - 1;
    return { G: (totalLen - n1 * F) / 2, n: n1 };
  }
  return { G: G_calc, n: n0 };
}

/** Alleen de eindmaat, zonder het aantal steek-intervallen. */
export function calcAutoGValue(totalLen: number, F: number, Gmin: number): number {
  return calcAutoG(totalLen, F, Gmin).G;
}
