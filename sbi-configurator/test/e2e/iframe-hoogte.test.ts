/**
 * De iframe-route: groeit én krimpt de pagina mee met de inhoud?
 *
 * Aanleiding: op de MCA-site werd de pagina onnodig lang zodra je onderin de
 * configurator kwam. Oorzaak was `min-height: 100vh` op `:host`. In een iframe
 * die met zijn inhoud meegroeit is `100vh` niet "het venster" maar de hoogte
 * die de ouderpagina zojuist heeft ingesteld — en dus de vórige meting. Daarmee
 * werd `min-height` een ondergrens die alleen kon stijgen: sluit je een stap,
 * dan krimpt de inhoud wel maar het element niet.
 *
 * Deze suite legt vast dat de hoogte weer omlaag gaat, en bevat onderaan een
 * permanente tegenproef die aantoont dat de test dat echt meet.
 *
 * Ouder en kind worden via `page.route()` op één verzonnen origin geserveerd:
 * dat lijkt beter op productie dan `file://`, houdt ze same-origin zodat de
 * test in beide kan kijken, en laat geen bestanden achter in `dist/`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const DIST = resolve(ROOT, 'dist/mca-sbi-configurator.html');

const BASIS = 'https://configurator.test';

/**
 * De ouderpagina, met het script zoals het in de documentatie staat.
 * `__meldingen` legt de berichtenstroom vast, zodat we niet alleen de eindstand
 * maar ook het verloop kunnen beoordelen.
 */
const OUDER_HTML = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Gastpagina met iframe</title>
<style>body{margin:0;font-family:Georgia,serif}</style></head>
<body>
  <p>Inhoud boven de configurator.</p>
  <iframe id="sbi" src="/configurator.html"
          style="width:100%;border:0;height:1400px"
          title="SBI bestelcode-configurator"
          allow="clipboard-write"></iframe>
  <p>Inhoud onder de configurator.</p>
  <script>
    window.__meldingen = [];
    (function () {
      var iframe = document.getElementById('sbi');
      var vorige = 0;
      window.addEventListener('message', function (e) {
        if (e.source !== iframe.contentWindow) return;
        if (!e.data || e.data.type !== 'mca-sbi-configurator:hoogte') return;
        var h = e.data.hoogte;
        if (typeof h !== 'number' || !Number.isFinite(h)) return;
        window.__meldingen.push(h);
        h = Math.min(Math.max(h, 400), 20000);
        if (h === vorige) return;
        vorige = h;
        iframe.style.height = h + 'px';
      });
    })();
  </script>
</body>
</html>`;

/** Serveert ouder + kind op één origin. `variant` mag de configurator aanpassen. */
async function openOuder(browser: Browser, variant: (html: string) => string = (h) => h): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10_000);

  const configurator = variant(readFileSync(DIST, 'utf8'));

  await page.route(`${BASIS}/**`, (route) => {
    const pad = new URL(route.request().url()).pathname;
    if (pad === '/configurator.html') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: configurator });
    }
    if (pad === '/' || pad === '/index.html') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: OUDER_HTML });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  // Het logo is de enige externe request.
  await page.route('**://www.mcabv.nl/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' })
  );

  await page.goto(`${BASIS}/`);
  await page.waitForFunction(
    "document.getElementById('sbi')?.contentDocument?.querySelector('mca-sbi-configurator')?.shadowRoot?.getElementById('codeDisplay') != null",
    null,
    { timeout: 20_000 }
  );
  return page;
}

/** Handelingen binnen de iframe; Playwright kan er met frameLocator bij. */
function cfg(page: Page) {
  return page.frameLocator('#sbi').locator('mca-sbi-configurator');
}

async function opendeStap(page: Page, stap: number): Promise<void> {
  const open = await page.evaluate(
    `document.getElementById('sbi').contentDocument
       .querySelector('mca-sbi-configurator').shadowRoot
       .getElementById('step${stap}')?.classList.contains('active') === true`
  );
  if (!open) {
    await cfg(page).locator(`#step${stap} .step-header`).first().click();
    await page.waitForTimeout(60);
  }
}

/** Alles wat we over de hoogte willen weten, in één meting. */
const METING = `(() => {
  const iframe = document.getElementById('sbi');
  const doc = iframe.contentDocument;
  const el = doc.querySelector('mca-sbi-configurator');
  return {
    iframeHoogte: Math.round(iframe.getBoundingClientRect().height),
    elementHoogte: Math.ceil(el.getBoundingClientRect().height),
    documentHoogte: doc.documentElement.scrollHeight,
    binnenVenster: iframe.contentWindow.innerHeight,
    meldingen: window.__meldingen.slice(),
  };
})()`;

interface Meting {
  iframeHoogte: number;
  elementHoogte: number;
  documentHoogte: number;
  binnenVenster: number;
  meldingen: number[];
}

const meet = (page: Page) => page.evaluate(METING) as Promise<Meting>;

/**
 * De doorloop die het probleem uitlokt: eerst opblazen tot stap 12B verschijnt,
 * dan weer terug naar een korte configuratie.
 */
async function blaasOpEnKrimp(page: Page): Promise<{ piek: Meting; eind: Meting }> {
  await opendeStap(page, 1);
  await cfg(page).locator(`#step1 .opt-btn[onclick^="select(1,'SBI15'"]`).first().click();
  await opendeStap(page, 2);
  await cfg(page).locator(`#step2 .opt-btn[onclick^="select(2,'FL'"]`).first().click();

  await opendeStap(page, 12);
  await cfg(page).locator('#lengthInput').fill('9000');
  await cfg(page).locator('#lengthInput').dispatchEvent('input');
  await page.waitForTimeout(400);
  const piek = await meet(page);

  // Terug naar een lengte die binnen één rail past: stap 12B verdwijnt.
  await cfg(page).locator('#lengthInput').fill('1200');
  await cfg(page).locator('#lengthInput').dispatchEvent('input');
  await page.waitForTimeout(300);
  // En de stapkaart weer dichtklappen.
  await cfg(page).locator('#step12 .step-header').first().click();
  await page.waitForTimeout(400);
  const eind = await meet(page);

  return { piek, eind };
}

describe('iframe met meegroeiende hoogte', () => {
  let browser: Browser;

  beforeAll(async () => {
    if (!existsSync(DIST)) throw new Error(`${DIST} ontbreekt — draai eerst \`npm run build\`.`);
    browser = await chromium.launch();
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
  });

  it('krimpt weer nadat stap 12B verdwijnt en de stap dichtgaat', async () => {
    const page = await openOuder(browser);
    try {
      const { piek, eind } = await blaasOpEnKrimp(page);

      // Stap 12B maakt de configurator ruim tweemaal zo hoog; daarna moet er
      // fors af. Een ruime marge, want de exacte hoogtes verschuiven bij elke
      // stijlwijziging — het gaat om de relatie, niet om het getal.
      expect(piek.iframeHoogte).toBeGreaterThan(3000);
      expect(eind.iframeHoogte).toBeLessThan(piek.iframeHoogte - 1500);

      // Belangrijker dan "kleiner dan de piek": de hoogte moet kloppen met de
      // inhoud. Kleiner worden kan ook met een verkeerde waarde.
      expect(Math.abs(eind.iframeHoogte - eind.elementHoogte)).toBeLessThanOrEqual(2);
    } finally {
      await page.close();
    }
  }, 120_000);

  it('laat geen schuifbalk in de iframe achter', async () => {
    // Dit is de enige test die de 8px body-marge van het gastdocument afdekt.
    const page = await openOuder(browser);
    try {
      const { eind } = await blaasOpEnKrimp(page);
      expect(eind.documentHoogte).toBeLessThanOrEqual(eind.binnenVenster + 1);
    } finally {
      await page.close();
    }
  }, 120_000);

  it('meldt geen dubbele waarden en oscilleert niet', async () => {
    const page = await openOuder(browser);
    try {
      const { eind } = await blaasOpEnKrimp(page);
      const m = eind.meldingen;

      expect(m.length).toBeGreaterThan(0);
      // Geen twee identieke berichten achter elkaar: dat is de dedup.
      for (let i = 1; i < m.length; i++) {
        expect(m[i], `melding ${i} herhaalt ${m[i - 1]}`).not.toBe(m[i - 1]);
      }
      // Ruime bovengrens: bij een terugkoppeling loopt dit in de tientallen.
      expect(m.length).toBeLessThan(15);
    } finally {
      await page.close();
    }
  }, 120_000);

  it('de gebouwde bestanden bevatten geen viewport-eenheden meer', () => {
    // Goedkoopste bewaking van allemaal, en degene die afgaat als iemand
    // split-legacy.mjs draait terwijl de patch stil niet meer matcht.
    for (const naam of ['mca-sbi-configurator.html', 'mca-sbi-configurator-embed.html']) {
      const inhoud = readFileSync(resolve(ROOT, 'dist', naam), 'utf8');
      expect(inhoud, naam).not.toMatch(/100vh/);
    }
  });

  /**
   * Tegenproef — permanent, niet eenmalig.
   *
   * Zet `min-height: 100vh` terug in de `:host`-regel en draai dezelfde
   * doorloop. De hoogte hóórt dan op de piek te blijven hangen. Slaagt deze
   * test onverwacht, dan meet de eerste test niet wat hij beweert te meten.
   */
  it('tegenproef: mét min-height:100vh blijft hij wél op de piek hangen', async () => {
    const page = await openOuder(browser, (html) =>
      html.replace(':host{display:block}', ':host{display:block;min-height:100vh}')
    );
    try {
      // Eerst controleren dat de injectie überhaupt is aangekomen.
      const geinjecteerd = await page.evaluate(
        `getComputedStyle(document.getElementById('sbi').contentDocument
           .querySelector('mca-sbi-configurator')).minHeight`
      );
      expect(geinjecteerd, 'de min-height is niet geïnjecteerd — tegenproef zegt niets').not.toBe('0px');

      const { piek, eind } = await blaasOpEnKrimp(page);
      expect(eind.iframeHoogte).toBe(piek.iframeHoogte);
    } finally {
      await page.close();
    }
  }, 120_000);
});
