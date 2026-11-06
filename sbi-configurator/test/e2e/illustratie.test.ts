/**
 * De illustratie in de zijbalk (B-004): per rail de foto uit stap 8, met het
 * gekozen aantal loopwagens. De foto wordt vergeleken met die in de knop van
 * stap 8, zodat vaststaat dat de zijbalk echt dezelfde afbeelding toont.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type Page, type Locator } from 'playwright';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '../../dist/mca-sbi-configurator.html');

let browser: Browser;
let page: Page;
let c: Locator;

const knop = (stap: number, code: string) =>
  c.locator(`#step${stap} .option-grid .opt-btn`).filter({
    has: c.page().locator('.opt-code', { hasText: new RegExp(`^${code || '—'}$`) }),
  });

const klik = (l: Locator) => l.evaluate((el) => (el as HTMLElement).click());

const fotos = () => c.locator('#illustrationSvg image');

const fotoUitStap8 = (aantal: number) =>
  knop(8, String(aantal)).locator('img').getAttribute('src');

const hoogteVanViewBox = async () =>
  Number((await c.locator('#illustrationSvg').getAttribute('viewBox'))!.split(' ')[3]);

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

describe('illustratie: foto per rail', () => {
  it('toont vóór elke keuze één rail met één loopwagen', async () => {
    const leeg = await browser.newPage();
    await leeg.goto(pathToFileURL(DIST).href);
    const beeld = leeg.locator('mca-sbi-configurator #illustrationSvg image');
    expect(await beeld.count()).toBe(1);
    await leeg.close();
  });

  it.each([1, 2, 3, 4])('%i loopwagen(s) per rail: de foto uit stap 8', async (aantal) => {
    await klik(knop(8, String(aantal)));
    expect(await fotos().count()).toBe(1);
    expect(await fotos().getAttribute('href')).toBe(await fotoUitStap8(aantal));
  });

  it.each([
    ['I', 1],
    ['II', 2],
    ['III', 3],
    ['IV', 4],
  ])('stap 14 "%s": %i rij(en) met dezelfde foto', async (code, rijen) => {
    await klik(knop(8, '3'));
    await klik(knop(14, code as string));
    expect(await fotos().count()).toBe(rijen);
    const verwacht = await fotoUitStap8(3);
    for (const foto of await fotos().all()) {
      expect(await foto.getAttribute('href')).toBe(verwacht);
    }
  });

  it('de rijen overlappen niet en passen binnen de tekening', async () => {
    await klik(knop(14, 'IV'));
    const vakken = await fotos().evaluateAll((els) =>
      els.map((el) => ({
        y: Number(el.getAttribute('y')),
        h: Number(el.getAttribute('height')),
      })),
    );
    for (let i = 1; i < vakken.length; i++) {
      expect(vakken[i]!.y).toBeGreaterThanOrEqual(vakken[i - 1]!.y + vakken[i - 1]!.h);
    }
    const laatste = vakken[vakken.length - 1]!;
    expect(await hoogteVanViewBox()).toBeGreaterThan(laatste.y + laatste.h);
  });

  it('lengtemaat en bijschrift blijven staan', async () => {
    await klik(knop(8, '2'));
    await klik(knop(14, 'III'));
    const tekst = await c.locator('#illustrationSvg').textContent();
    expect(tekst).toMatch(/Lengte:/);
    expect(tekst).toMatch(/2× loopwagen per rail · 3 rails parallel/);
  });

  it('zonder loopwagen: per rail de foto van de kale rail', async () => {
    const metLoopwagens = await Promise.all([1, 2, 3, 4].map(fotoUitStap8));
    await klik(knop(14, 'II'));
    await klik(c.locator('#step2 .opt-btn-skip'));

    expect(await fotos().count()).toBe(2);
    expect(await c.locator('#illustrationSvg rect').count()).toBe(0);
    for (const foto of await fotos().all()) {
      const href = await foto.getAttribute('href');
      expect(href).toMatch(/^data:image\/webp/);
      expect(metLoopwagens).not.toContain(href);
    }
    expect(await c.locator('#illustrationSvg').textContent()).toMatch(/Geen loopwagen/);
  });

  it('een loopwagen kiezen na "geen loopwagen" brengt de foto uit stap 8 terug', async () => {
    await klik(knop(8, '2'));
    const verwacht = await fotoUitStap8(2);
    await klik(c.locator('#step2 .opt-btn-skip'));
    await klik(knop(2, 'FL'));
    await klik(knop(8, '2'));
    expect(await fotos().getAttribute('href')).toBe(verwacht);
  });
});
