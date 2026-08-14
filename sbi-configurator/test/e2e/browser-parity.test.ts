/**
 * Pariteit in een échte browser.
 *
 * De domeintests bewijzen dat de berekening klopt. Deze test bewijst dat het
 * gebouwde bestand dat je daadwerkelijk uploadt zich net zo gedraagt als v1.8 —
 * inclusief de bedrading, de inline handlers, de zichtbaarheidsregels en de
 * teksten die in de offerte-mail belanden.
 *
 * Draait tegen `dist/mca-sbi-configurator.html`, dus na `npm run build`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

const V18 = resolve(ROOT, 'reference/v1.8.html');
const DIST = resolve(ROOT, 'dist/mca-sbi-configurator.html');

/** Eén stap in een scenario. */
type Stap =
  | { doe: 'kies'; stap: number; code: string }
  | { doe: 'geenLoopwagen' }
  | { doe: 'lengte'; mm: number }
  | { doe: 'aantal'; n: number }
  | { doe: 'steek'; eerste: number; laatste: number };

interface Scenario {
  naam: string;
  stappen: Stap[];
}

/**
 * De momentopname die we tussen beide versies vergelijken.
 * Bewust breed: bestelcode, voortgang, zichtbaarheid én de tekst die de klant
 * en MCA uiteindelijk te zien krijgen.
 */
interface Momentopname {
  bestelcode: string;
  codeDisplay: string;
  voortgang: string;
  offerteKnopActief: boolean;
  stap12bZichtbaar: boolean;
  stap12bMelding: string;
  stap12bBanner: string;
  stap12bModelInfo: string;
  volgende12Actief: boolean;
  volgende12bActief: boolean;
  koppelDelen: string[];
  koppelTabel: Record<string, string>;
  koppelTekening: string;
  zijbalkKoppelingZichtbaar: boolean;
  zijbalkKoppeling: Record<string, string>;
  specificatie: Record<string, string>;
  stap2Melding: string;
  verborgenLoopwagens: string[];
  suggesties12: string[];
  illustratie: string;
  fouten: string[];
}

async function openPagina(browser: Browser, bestand: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  // Snel falen: een niet-klikbaar element is hier een bevinding, geen wachtspel.
  page.setDefaultTimeout(8_000);
  const fouten: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') fouten.push(m.text());
  });
  page.on('pageerror', (e) => fouten.push(String(e)));
  // Het logo is de enige externe request. Niet blokkeren maar beantwoorden met
  // een lege SVG: afbreken levert een console-fout op, en dan zou de test zijn
  // eigen ruis meten. (Dat het logo überhaupt extern is, is bevinding R uit het
  // plan — wordt in fase 2 een inline SVG.)
  await page.route('**://www.mcabv.nl/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    })
  );
  await page.goto(pathToFileURL(bestand).href);
  // Als string, niet als functie: vitest transformeert functie-literals en dan
  // is de predicaat in de browsercontext niet meer uitvoerbaar.
  await page.waitForFunction("typeof window.buildCode === 'function'", null, { timeout: 15_000 });
  (page as any).__fouten = fouten;
  return page;
}

/** Welke stapkaart moet openstaan voor deze handeling. */
function stapVan(s: Stap): number {
  switch (s.doe) {
    case 'kies': return s.stap;
    case 'geenLoopwagen': return 2;
    case 'lengte': return 12;
    case 'aantal': return 15;
    case 'steek': return 13;
  }
}

/**
 * De configurator is een accordeon: alleen de actieve stapkaart toont zijn
 * inhoud. Een echte gebruiker klikt de kop open; dat doen we hier ook, maar
 * alleen als de kaart nog dicht is — `toggleStep` klapt hem anders juist dicht.
 */
async function opendeStap(page: Page, stap: number): Promise<void> {
  const open = await page.evaluate(
    `!!document.getElementById('step${stap}')?.classList.contains('active')`
  );
  if (!open) {
    await page.locator(`#step${stap} .step-header`).first().click();
    await page.waitForTimeout(20);
  }
}

async function voerUit(page: Page, stappen: Stap[]): Promise<void> {
  for (const s of stappen) {
    await opendeStap(page, stapVan(s));
    switch (s.doe) {
      case 'kies': {
        const sel = `#step${s.stap} .opt-btn[onclick^="select(${s.stap},'${s.code}'"]`;
        await page.locator(sel).first().click();
        break;
      }
      case 'geenLoopwagen':
        await page.locator('#step2 .opt-btn[onclick^="selectNoCarriage"]').first().click();
        break;
      case 'lengte':
        await page.fill('#lengthInput', String(s.mm));
        await page.dispatchEvent('#lengthInput', 'input');
        break;
      case 'aantal':
        await page.fill('#qtyInput', String(s.n));
        await page.dispatchEvent('#qtyInput', 'input');
        break;
      case 'steek':
        await page.fill('#pitchFirst', String(s.eerste));
        await page.fill('#pitchLast', String(s.laatste));
        await page.dispatchEvent('#pitchLast', 'input');
        break;
    }
    await page.waitForTimeout(20);
  }
  // De UI doet een paar dingen met setTimeout (scrollIntoView); even laten landen.
  await page.waitForTimeout(80);
}

/**
 * Als string, niet als functie-literal: vitest transformeert functies die aan
 * page.evaluate worden meegegeven, waarna ze in de browsercontext niet meer
 * uitvoerbaar zijn.
 */
const LEES_SCRIPT = `(() => {
  const w = window;
  const tekst = (id) => (document.getElementById(id)?.textContent ?? '').trim();
  const zichtbaar = (id) => {
    const el = document.getElementById(id);
    return el ? getComputedStyle(el).display !== 'none' : false;
  };
  const knopUit = (id) => !!document.getElementById(id)?.disabled;

  const spec = {};
  for (const id of ['bd1','bd2','bd4','bd5','bd7','bd8','bd12','bd13','bd14','bd15']) {
    spec[id] = tekst(id);
  }

  const verborgen = [];
  document.querySelectorAll('#step2 .opt-btn[data-models]').forEach((el) => {
    if (el.style.display === 'none') {
      verborgen.push((el.querySelector('.opt-code')?.textContent ?? '?').trim());
    }
  });

  const sug = [];
  document.querySelectorAll('#step12SugList .wizard-sug-pill, #cpSugList .sug-pill').forEach((p) => {
    sug.push((p.textContent ?? '').replace(/\\s+/g, ' ').trim());
  });

  // cpCouplingActive/cpValid/cpLastParts zijn top-level \`let\`-declaraties en
  // staan dus NIET op window — niet in v1.8 en niet in v2. Ze uitlezen zou aan
  // beide kanten undefined opleveren en de koppelroute ongemerkt ongetoetst
  // laten. Daarom lezen we hier wat de klant daadwerkelijk ziet: de gerenderde
  // deellijst, de uitvoertabel en de zijbalk.
  const koppelDelen = [];
  document.querySelectorAll('#cpRailList .rail-card').forEach((el) => {
    koppelDelen.push((el.textContent ?? '').replace(/\\s+/g, ' ').trim());
  });

  const koppelTabel = {};
  for (const id of ['cpRF','cpRK','cpRMaxL','cpRMaxLUser','cpRMinLast','cpRParts','cpRG1G2','cpRTotal']) {
    koppelTabel[id] = tekst(id);
  }

  const zijbalkKoppeling = {};
  for (const id of ['bdCoupling','bdCouplingParts','bdCouplingK','bdCouplingG']) {
    zijbalkKoppeling[id] = tekst(id);
  }

  // De tekening is de tweede zichtbare uitkomst van de koppelberekening.
  const svg = document.getElementById('cpRailSvg');
  const tekening = svg ? (svg.innerHTML || '').replace(/\\s+/g, ' ').trim() : '';

  return {
    bestelcode: w.buildCode(),
    codeDisplay: tekst('codeDisplay').replace(/\\s+/g, ' '),
    voortgang: tekst('progressPct'),
    offerteKnopActief: !knopUit('requestBtn'),
    stap12bZichtbaar: zichtbaar('step12b'),
    stap12bMelding: tekst('cpAlertBox').replace(/\\s+/g, ' '),
    stap12bBanner: tekst('cpBannerText').replace(/\\s+/g, ' '),
    stap12bModelInfo: tekst('cpModelInfo').replace(/\\s+/g, ' '),
    volgende12Actief: !knopUit('next12'),
    volgende12bActief: !knopUit('next12b'),
    koppelDelen,
    koppelTabel,
    koppelTekening: tekening,
    zijbalkKoppelingZichtbaar: zichtbaar('couplingBreakdownWrap'),
    zijbalkKoppeling,
    specificatie: spec,
    stap2Melding: tekst('step2FilterNotice').replace(/\\s+/g, ' '),
    verborgenLoopwagens: verborgen,
    suggesties12: sug,
    illustratie: (document.getElementById('illustrationSvg')?.innerHTML ?? '').replace(/\\s+/g,' ').trim(),
  };
})()`;

async function lees(page: Page): Promise<Momentopname> {
  const snap = (await page.evaluate(LEES_SCRIPT)) as Omit<Momentopname, 'fouten'>;
  return { ...snap, fouten: ((page as any).__fouten as string[]) ?? [] };
}

const scenarios: Scenario[] = [
  {
    naam: 'standaard configuratie SBI20, 1200 mm',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI20' },
      { doe: 'kies', stap: 2, code: 'FL' },
      { doe: 'kies', stap: 7, code: 'DD' },
      { doe: 'kies', stap: 8, code: '2' },
      { doe: 'lengte', mm: 1200 },
      { doe: 'kies', stap: 14, code: 'II' },
      { doe: 'aantal', n: 3 },
    ],
  },
  {
    naam: 'gekoppelde rail SBI15 @ 9000 mm',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI15' },
      { doe: 'kies', stap: 2, code: 'FL' },
      { doe: 'lengte', mm: 9000 },
    ],
  },
  {
    naam: 'SBI45 exact op de handelslengte (3960 mm)',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI45' },
      { doe: 'kies', stap: 2, code: 'SL' },
      { doe: 'lengte', mm: 3960 },
    ],
  },
  {
    naam: 'SBI45 net over de handelslengte (3961 mm) — suggesties nodig',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI45' },
      { doe: 'kies', stap: 2, code: 'SL' },
      { doe: 'lengte', mm: 3961 },
    ],
  },
  {
    naam: 'SBI65 @ 12000 mm',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI65' },
      { doe: 'kies', stap: 2, code: 'HL' },
      { doe: 'lengte', mm: 12000 },
    ],
  },
  {
    naam: 'SBI30 @ 5000 mm — het model waar suggesties nooit werken (V-001)',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI30' },
      { doe: 'kies', stap: 2, code: 'FL' },
      { doe: 'lengte', mm: 5000 },
    ],
  },
  {
    naam: 'geen loopwagen — alleen rail',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI25' },
      { doe: 'geenLoopwagen' },
      { doe: 'lengte', mm: 2000 },
      { doe: 'kies', stap: 14, code: 'III' },
    ],
  },
  {
    naam: 'geen loopwagen en weer terug',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI25' },
      { doe: 'geenLoopwagen' },
      { doe: 'kies', stap: 2, code: 'SLL' },
      { doe: 'lengte', mm: 2000 },
    ],
  },
  {
    naam: 'modelwissel maakt het gekozen loopwagentype ongeldig',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI20' },
      { doe: 'kies', stap: 2, code: 'CLS' },
      { doe: 'kies', stap: 1, code: 'SBI65' },
      { doe: 'lengte', mm: 1500 },
    ],
  },
  {
    naam: 'te korte rail (50 mm) — onder de ondergrens',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI20' },
      { doe: 'kies', stap: 2, code: 'FL' },
      { doe: 'lengte', mm: 50 },
    ],
  },
  {
    naam: 'handmatige steek die niet opgaat',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI20' },
      { doe: 'kies', stap: 2, code: 'FL' },
      { doe: 'lengte', mm: 1200 },
      { doe: 'steek', eerste: 25, laatste: 25 },
    ],
  },
  {
    naam: 'volledig ingevuld — offerteknop moet actief worden',
    stappen: [
      { doe: 'kies', stap: 1, code: 'SBI20' },
      { doe: 'kies', stap: 2, code: 'FL' },
      { doe: 'kies', stap: 3, code: 'N' },
      { doe: 'kies', stap: 4, code: 'P' },
      { doe: 'kies', stap: 5, code: 'K2' },
      { doe: 'kies', stap: 6, code: 'MF' },
      { doe: 'kies', stap: 7, code: 'ZZ' },
      { doe: 'kies', stap: 8, code: '4' },
      { doe: 'kies', stap: 9, code: 'HT' },
      { doe: 'kies', stap: 10, code: 'FCR' },
      { doe: 'kies', stap: 11, code: 'B' },
      { doe: 'lengte', mm: 2400 },
      { doe: 'kies', stap: 14, code: 'IV' },
      { doe: 'aantal', n: 10 },
    ],
  },
];

describe('browser-pariteit: dist tegen v1.8', () => {
  let browser: Browser;

  beforeAll(async () => {
    if (!existsSync(DIST)) {
      throw new Error(`${DIST} ontbreekt — draai eerst \`npm run build\`.`);
    }
    browser = await chromium.launch();
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
  });

  for (const scenario of scenarios) {
    it(scenario.naam, async () => {
      const oud = await openPagina(browser, V18);
      const nieuw = await openPagina(browser, DIST);
      try {
        await voerUit(oud, scenario.stappen);
        await voerUit(nieuw, scenario.stappen);

        const a = await lees(oud);
        const b = await lees(nieuw);

        // Console-fouten apart beoordelen: v1.8 heeft ze niet, dus v2 ook niet.
        expect(b.fouten).toEqual([]);

        const { fouten: _f1, ...aVergelijk } = a;
        const { fouten: _f2, ...bVergelijk } = b;
        expect(bVergelijk).toEqual(aVergelijk);
      } finally {
        await oud.close();
        await nieuw.close();
      }
    }, 120_000);
  }
});
