/**
 * Combinaties die MCA niet levert (src/domain/regels.ts), in de echte build.
 *
 * Met een HT-eindplaat (stap 9) zijn geen smeercontainer MF (stap 6) en geen
 * extra afdichting DD/ZZ/KK (stap 7) mogelijk. Stap 9 komt ná 6 en 7, dus het
 * lastige geval is de klant die eerst MF en DD kiest en daarna HT.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type Page, type Locator } from 'playwright';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

import { isToegestaan } from '../../src/domain/regels';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '../../dist/mca-sbi-configurator.html');

let browser: Browser;
let page: Page;
let c: Locator;

/** Knop in stap `stap` met zichtbare code `code` ('' = standaard). */
const knop = (stap: number, code: string) =>
  c.locator(`#step${stap} .option-grid .opt-btn`).filter({
    has: c.page().locator('.opt-code', { hasText: new RegExp(`^${code || '—'}$`) }),
  });

/**
 * Klik via de DOM. Ingeklapte stappen zijn onzichtbaar en daarmee voor
 * Playwright niet klikbaar; de klant klapt ze open, de test hoeft dat niet.
 */
const klik = (l: Locator) => l.evaluate((el) => (el as HTMLElement).click());

const bestelcode = async () => (await c.locator('#codeDisplay').innerText()).replace(/\s|·/g, '-');

beforeAll(async () => {
  if (!existsSync(DIST)) throw new Error('Eerst `npm run build` draaien');
  browser = await chromium.launch();
});
afterAll(async () => browser?.close());

beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(pathToFileURL(DIST).href);
  c = page.locator('mca-sbi-configurator');
  await klik(knop(1, 'SBI25'));
  await klik(knop(2, 'FL'));
});

describe('domein: HT sluit MF en elke afdichting uit', () => {
  it('zonder HT mag alles', () => {
    expect(isToegestaan(6, 'MF', { 9: '' })).toBe(true);
    expect(isToegestaan(7, 'KK', {})).toBe(true);
  });
  it('met HT: stap 6 alleen standaard, stap 7 vervalt', () => {
    const ht = { 9: 'HT' };
    expect(isToegestaan(6, 'MF', ht)).toBe(false);
    expect(isToegestaan(6, '', ht)).toBe(true);
    // Stap 7 vervalt helemaal: de HT-eindplaat is de afdichting.
    for (const code of ['', 'DD', 'ZZ', 'KK']) expect(isToegestaan(7, code, ht)).toBe(false);
    expect(isToegestaan(5, 'K3', ht)).toBe(true);
  });
});

describe('UI: HT-eindplaat', () => {
  it('eerst MF en DD, daarna HT: MF wordt standaard, afdichting vervalt', async () => {
    await klik(knop(6, 'MF'));
    await klik(knop(7, 'DD'));
    expect(await bestelcode()).toMatch(/MF/);
    expect(await bestelcode()).toMatch(/DD/);
    await klik(knop(9, 'HT'));

    expect(await knop(6, '').getAttribute('class')).toMatch(/selected/);
    expect(await c.locator('#sel7').innerText()).toBe('Geen afdichting (HT-eindplaat)');
    expect(await c.locator('#step7 .opt-btn.selected').count()).toBe(0);
    const code = await bestelcode();
    expect(code).toMatch(/HT/);
    expect(code).not.toMatch(/MF|DD/);
    expect(await c.locator('#sel6').innerText()).not.toMatch(/Smeervilt/);
    expect(await c.locator('#uitsluiting9').getAttribute('hidden')).toBeNull();
  });

  it('met HT zijn MF en alle afdichtingen niet te kiezen', async () => {
    await klik(knop(9, 'HT'));
    for (const [stap, code] of [[6, 'MF'], [7, ''], [7, 'DD'], [7, 'ZZ'], [7, 'KK']] as const) {
      expect(await knop(stap, code).isDisabled(), `${stap}/${code}`).toBe(true);
    }
    expect(await knop(6, '').isDisabled()).toBe(false);
    expect(await c.locator('#uitsluiting7').getAttribute('hidden')).toBeNull();
    expect(await c.locator('#uitsluiting7').textContent()).toMatch(/HT-eindplaat is de afdichting/);
  });

  it('terug naar standaard eindplaat geeft alles weer vrij', async () => {
    await klik(knop(9, 'HT'));
    await klik(knop(9, ''));
    expect(await knop(6, 'MF').isDisabled()).toBe(false);
    expect(await knop(7, 'KK').isDisabled()).toBe(false);
    expect(await knop(7, '').getAttribute('class')).toMatch(/selected/);
    expect(await c.locator('#sel7').innerText()).not.toMatch(/HT/);
    expect(await c.locator('#uitsluiting6').getAttribute('hidden')).not.toBeNull();
  });

  it('daarna geen loopwagen kiezen laat stap 7 op n.v.t.', async () => {
    await klik(knop(9, 'HT'));
    await klik(c.locator('#step2 .opt-btn-skip'));
    expect(await c.locator('#sel7').innerText()).toMatch(/N\.v\.t\./);
    expect(await knop(7, 'DD').isDisabled()).toBe(false);
  });
});
