/**
 * Inbedding: draait de configurator in een bestaande pagina zonder die te slopen?
 *
 * Dit is de test die het eigenlijke probleem afdekt. v1.8 opende met
 *
 *     * { box-sizing: border-box; margin: 0; padding: 0 }
 *     body { font-family: …; background: …; color: …; min-height: 100vh }
 *
 * zonder enige scope. De derde test hieronder meet na wat dat precies aanricht
 * als je het als "Custom HTML" in een WordPress- of YOOtheme-pagina plakt — en
 * de schade is gerichter dan je op het eerste gezicht zou zeggen:
 *
 *   - `*` heeft specificiteit (0,0,0) en verliest van élke themaregel die een
 *     element of class noemt. Het slaat dus vooral de browserstandaarden plat
 *     van wat het thema níét expliciet opmaakt: koppen, lijsten, citaten.
 *   - De `body`-regel en de class-namen (`.header`, `.hero`, `.layout`) hebben
 *     wél dezelfde specificiteit als het thema en staan later in het document.
 *     Die winnen dus: site-lettertype, achtergrond en elk element met een
 *     botsende class gaan eraan.
 *
 * De gastpagina bootst een vijandige omgeving na: een thema met eigen opmaak,
 * botsende class-namen, botsende element-ID's en een agressieve knopstijl zoals
 * UIkit die heeft.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const DIST = resolve(ROOT, 'dist/mca-sbi-configurator.html');
/** Het fragment dat daadwerkelijk in YOOtheme geplakt wordt. */
const EMBED = resolve(ROOT, 'dist/mca-sbi-configurator-embed.html');
const GASTPAGINA = resolve(ROOT, 'dist/test-inbedding.html');

/** Waarden die het "thema" zet en die onaangeroerd moeten blijven. */
const THEMA = {
  bodyMarge: '24px',
  bodyFont: 'Georgia',
  bodyAchtergrond: 'rgb(255, 248, 220)',
  alineaMarge: '16px',
  headerPadding: '32px',
  knopPadding: '12px',
};

/**
 * Bouwt een gastpagina met het script van de configurator erin geplakt,
 * precies zoals een "Custom HTML"-blok dat zou doen.
 */
function bouwGastpagina(): void {
  // Bewust het EMBED-fragment, niet de standalone pagina: dit is letterlijk wat
  // in het Custom HTML-blok geplakt wordt, dus dat hoort getest te worden.
  const fragment = readFileSync(EMBED, 'utf8');

  writeFileSync(
    GASTPAGINA,
    `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Gastpagina — bootst een WordPress/YOOtheme-omgeving na</title>
<style>
  body {
    margin: ${THEMA.bodyMarge};
    font-family: ${THEMA.bodyFont}, serif;
    background: ${THEMA.bodyAchtergrond};
    color: #333;
  }
  p { margin: ${THEMA.alineaMarge}; }
  /* Class-namen die v1.8 óók gebruikt — hier komen ze van het thema. */
  .header { padding: ${THEMA.headerPadding}; background: #123456; color: white; }
  .sidebar { padding: ${THEMA.headerPadding}; border: 2px solid #123456; }
  .hero { padding: ${THEMA.headerPadding}; }
  .layout { display: flex; gap: 40px; }
  /* Zoals UIkit doet: alle knoppen platslaan. */
  button { padding: ${THEMA.knopPadding}; border: 3px dotted #123456; font-family: ${THEMA.bodyFont}, serif; }
</style>
</head>
<body>
  <div class="header" id="thema-header">Menu van de site</div>
  <p id="thema-alinea">Een alinea van het thema.</p>
  <!-- Bewust NIET opgemaakt door het thema: hier slaat de \`*\`-reset wél toe. -->
  <h2 id="thema-kop">Een kop</h2>
  <ul id="thema-lijst"><li>Een lijstpunt</li></ul>
  <blockquote id="thema-citaat">Een citaat</blockquote>
  <div class="sidebar" id="thema-sidebar">Zijbalk van het thema</div>
  <button id="thema-knop">Knop van het thema</button>

  <!-- Element-ID's die met de configurator botsen. -->
  <div id="step1">Lokvogel met dezelfde ID als stap 1</div>
  <div id="codeDisplay">Lokvogel met dezelfde ID als de bestelcode</div>
  <div id="lengthInput">Lokvogel met dezelfde ID als het lengteveld</div>

  ${fragment}
</body>
</html>
`
  );
}

/** Als string: vitest transformeert functie-literals die naar de browser gaan. */
const METING = `(() => {
  const stijl = (sel, prop) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el)[prop] : null;
  };
  const cfg = document.querySelector('mca-sbi-configurator');
  const root = cfg && cfg.shadowRoot;
  return {
    thema: {
      bodyMarge: getComputedStyle(document.body).marginTop,
      bodyFont: getComputedStyle(document.body).fontFamily,
      bodyAchtergrond: getComputedStyle(document.body).backgroundColor,
      alineaMarge: stijl('#thema-alinea', 'marginTop'),
      headerPadding: stijl('#thema-header', 'paddingTop'),
      sidebarPadding: stijl('#thema-sidebar', 'paddingTop'),
      knopPadding: stijl('#thema-knop', 'paddingTop'),
      knopRand: stijl('#thema-knop', 'borderTopStyle'),
      headerAchtergrond: stijl('#thema-header', 'backgroundColor'),
      kopMarge: stijl('#thema-kop', 'marginTop'),
      lijstInspringing: stijl('#thema-lijst', 'paddingLeft'),
      citaatMarge: stijl('#thema-citaat', 'marginLeft'),
      lokvogelStap1: document.getElementById('step1')?.textContent,
      lokvogelCode: document.getElementById('codeDisplay')?.textContent,
    },
    configurator: {
      heeftShadowRoot: !!root,
      bestelcode: root ? (root.getElementById('codeDisplay')?.textContent ?? '').replace(/\\s+/g, ' ').trim() : null,
      aantalStapkaarten: root ? root.querySelectorAll('.step-card').length : 0,
      // De eigen knopstijl mag niet door het thema zijn overschreven.
      eigenKnopRand: root
        ? getComputedStyle(root.querySelector('#step1 .opt-btn')).borderTopStyle
        : null,
      eigenAchtergrond: root ? getComputedStyle(cfg).backgroundColor : null,
    },
  };
})()`;

describe('inbedding in een bestaande pagina', () => {
  let browser: Browser;

  beforeAll(async () => {
    for (const f of [DIST, EMBED]) {
      if (!existsSync(f)) throw new Error(`${f} ontbreekt — draai eerst \`npm run build\`.`);
    }
    bouwGastpagina();
    browser = await chromium.launch();
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
  });

  it('laat de opmaak van de gastpagina volledig intact', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const fouten: string[] = [];
    page.on('pageerror', (e) => fouten.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') fouten.push(m.text());
    });
    await page.route('**://www.mcabv.nl/**', (r) =>
      r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' })
    );

    try {
      await page.goto(pathToFileURL(GASTPAGINA).href);
      await page.waitForFunction(
        "document.querySelector('mca-sbi-configurator')?.shadowRoot?.getElementById('codeDisplay') != null",
        null,
        { timeout: 15_000 }
      );

      const r = (await page.evaluate(METING)) as {
        thema: Record<string, string | null>;
        configurator: Record<string, unknown>;
      };

      // Dit is de kern: v1.8 zou hier overal 0px en een ander lettertype geven.
      expect(r.thema.bodyMarge).toBe(THEMA.bodyMarge);
      expect(r.thema.alineaMarge).toBe(THEMA.alineaMarge);
      expect(r.thema.headerPadding).toBe(THEMA.headerPadding);
      expect(r.thema.sidebarPadding).toBe(THEMA.headerPadding);
      expect(r.thema.knopPadding).toBe(THEMA.knopPadding);
      expect(r.thema.knopRand).toBe('dotted');
      expect(r.thema.bodyFont).toContain(THEMA.bodyFont);
      expect(r.thema.bodyAchtergrond).toBe(THEMA.bodyAchtergrond);

      // De browserstandaarden van niet-opgemaakte elementen blijven staan —
      // precies wat de \`*\`-reset van v1.8 zou platslaan.
      expect(r.thema.headerAchtergrond).toBe('rgb(18, 52, 86)');
      expect(r.thema.kopMarge).not.toBe('0px');
      expect(r.thema.lijstInspringing).toBe('40px');
      expect(r.thema.citaatMarge).toBe('40px');

      // De lokvogels met botsende ID's blijven ongemoeid.
      expect(r.thema.lokvogelStap1).toBe('Lokvogel met dezelfde ID als stap 1');
      expect(r.thema.lokvogelCode).toBe('Lokvogel met dezelfde ID als de bestelcode');

      expect(fouten).toEqual([]);
    } finally {
      await page.close();
    }
  }, 120_000);

  it('werkt zelf gewoon, ook met botsende ID’s en een agressieve knopstijl', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.route('**://www.mcabv.nl/**', (r) =>
      r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' })
    );
    try {
      await page.goto(pathToFileURL(GASTPAGINA).href);
      await page.waitForFunction(
        "document.querySelector('mca-sbi-configurator')?.shadowRoot?.getElementById('codeDisplay') != null",
        null,
        { timeout: 15_000 }
      );

      const voor = (await page.evaluate(METING)) as { configurator: Record<string, unknown> };
      expect(voor.configurator.heeftShadowRoot).toBe(true);
      expect(voor.configurator.aantalStapkaarten).toBe(16); // 15 stappen + stap 12B
      // Het thema zet `border: 3px dotted` op elke knop; binnen de shadow root
      // mag daar niets van te merken zijn.
      expect(voor.configurator.eigenKnopRand).not.toBe('dotted');

      // En hij doet ook echt wat hij moet doen. Let op de scope: `#lengthInput`
      // bestaat óók op de gastpagina, dus zoeken we bewust binnen het element.
      // Dat de ongescoopte variant hier de verkeerde vindt, is precies waarom
      // de configurator zijn eigen opzoekingen moest scopen.
      const cfg = page.locator('mca-sbi-configurator');
      await cfg.locator('#step1 .opt-btn[onclick^="select(1,\'SBI20\'"]').first().click();
      await cfg.locator('#step2 .step-header').first().click();
      await cfg.locator('#step2 .opt-btn[onclick^="select(2,\'FL\'"]').first().click();
      await cfg.locator('#step12 .step-header').first().click();
      await cfg.locator('#lengthInput').fill('1200');
      await cfg.locator('#lengthInput').dispatchEvent('input');
      await page.waitForTimeout(150);

      const na = (await page.evaluate(METING)) as { configurator: Record<string, unknown> };
      expect(na.configurator.bestelcode).toContain('SBI20');
      expect(na.configurator.bestelcode).toContain('FL');
      expect(na.configurator.bestelcode).toContain('1200');

      // De lokvogel met dezelfde ID op de gastpagina is niet overschreven.
      const lokvogel = await page.evaluate("document.getElementById('codeDisplay').textContent");
      expect(lokvogel).toBe('Lokvogel met dezelfde ID als de bestelcode');
    } finally {
      await page.close();
    }
  }, 120_000);

  /**
   * Tegenproef. Zonder deze test weten we niet of de twee tests hierboven het
   * juiste meten — misschien zou dit thema wel álles overleven.
   *
   * Hier plakken we de stylesheet van v1.8 rechtstreeks in dezelfde gastpagina,
   * precies zoals een "Custom HTML"-blok dat zou doen. Het thema hóórt dan stuk
   * te gaan. Gaat deze test onverwacht slagen, dan is de gastpagina te braaf en
   * zeggen de andere twee niets.
   */
  it('tegenproef: met de ongescoopte CSS van v1.8 sneuvelt het thema wél', async () => {
    const v18 = readFileSync(resolve(ROOT, 'reference/v1.8.html'), 'utf8');
    const css = v18.slice(v18.indexOf('<style>') + 7, v18.indexOf('</style>'));
    const kapot = resolve(ROOT, 'dist/test-inbedding-v18.html');
    writeFileSync(
      kapot,
      readFileSync(GASTPAGINA, 'utf8')
        .replace('<mca-sbi-configurator></mca-sbi-configurator>', `<style>${css}</style>`)
        .replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/, '')
    );

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    try {
      await page.goto(pathToFileURL(kapot).href);
      const r = (await page.evaluate(METING)) as { thema: Record<string, string | null> };

      // Dit is wat er vandaag zou gebeuren bij een inline embed. Nagemeten,
      // niet aangenomen — de schade is gerichter dan je zou denken:
      //
      //   * { margin: 0; padding: 0 } heeft specificiteit (0,0,0) en verliest
      //     dus van élke themaregel die een element of class noemt. Wat het wél
      //     platslaat zijn de browserstandaarden van alles wat het thema niet
      //     expliciet opmaakt: koppen, lijsten, citaten.
      //
      //   De `body`-regel en de class-namen zijn een ander verhaal: die hebben
      //   dezelfde specificiteit als het thema en staan later in het document,
      //   dus die winnen wél.
      expect(r.thema.bodyFont).not.toContain(THEMA.bodyFont); // site-lettertype weg
      expect(r.thema.bodyAchtergrond).not.toBe(THEMA.bodyAchtergrond); // achtergrond weg
      expect(r.thema.kopMarge).toBe('0px'); // kopruimte weg (was 19.92px)
      expect(r.thema.lijstInspringing).toBe('0px'); // lijstinspringing weg (was 40px)
      expect(r.thema.citaatMarge).toBe('0px'); // citaatinspringing weg (was 40px)
      expect(r.thema.headerPadding).toBe('0px'); // .header botst: padding weg
      expect(r.thema.headerAchtergrond).toBe('rgb(255, 255, 255)'); // en wordt wit

      // En wat er níét kapotgaat, voor de volledigheid: het thema wint waar het
      // een element of class bij naam noemt met hogere specificiteit dan `*`.
      expect(r.thema.bodyMarge).toBe(THEMA.bodyMarge);
      expect(r.thema.alineaMarge).toBe(THEMA.alineaMarge);
      expect(r.thema.knopPadding).toBe(THEMA.knopPadding);
    } finally {
      await page.close();
    }
  }, 120_000);
});
