# Besluiten en bevindingen

Elke bewuste afwijking van het gedrag van `reference/v1.8.html` krijgt hier een
regel, met bron. Zo blijft altijd beantwoordbaar *waarom* v2 ergens anders werkt.

---

## Fase 0 — vastleggen

### B-000 · v1.8 bevroren als golden master

`reference/v1.8.html`, SHA-256 `4419952c52b6547ea4d2bdaea9dbc1bfaa64d935b29dacc8f0381543d52ede9f`,
read-only gezet. `test/golden/` legt het gedrag van het rekenhart vast:

| Fixture | Omvang |
|---|---|
| `autog.sweep.json` | 29.888 gevallen — elke mm van 100 t/m maxL, 8 modellen |
| `autog.cases.jsonl` | 6.836 leesbare gevallen (Gmin-terugval + bereikranden) |
| `parts.sweep.json` | 92.582 gevallen, 13.546 met oplossing |
| `parts.cases.jsonl` | 4.000 grensgevallen |
| `autonumparts.sweep.json` | 7.025 gevallen |
| `suggestions.cases.jsonl` | 264 gevallen |
| `buildcode.cases.jsonl` | 5.000 selectiestaten |
| `step9suggestions.cases.jsonl` | 56 gevallen |

De fixtures leggen vast **wat v1.8 doet**, niet wat het zou moeten doen. Bekende
defecten zitten er dus bewust in; ze worden in fase 3 één voor één en met eigen
ADR gewijzigd.

**Herleggen mag alleen** als je bewust gedrag verandert, en dan hoort er een
ADR-regel hieronder bij die uitlegt welke fixture waarom verschuift.

---

## Productregels

### B-003 · HT-eindplaat sluit MF en elke afdichting uit

**Opgave MCA, 13-10-2026.** Met een HT-eindplaat (stap 9) is geen
MF-smeercontainer (stap 6) mogelijk, en vervalt de afdichting (stap 7) helemaal:
de HT-eindplaat ís de afdichting. v1.8 kende deze regel niet.

**Uitwerking.** De regel staat als data in `src/domain/regels.ts`;
`src/ui/uitsluitingen.ts` past hem toe op de knoppen. Uitgesloten opties worden
grijs en onklikbaar, met de reden erbij. Koos de klant al MF of een afdichting
voordat hij HT koos (stap 9 komt ná 6 en 7), dan worden die vervangen door
Standaard respectievelijk "Geen afdichting (HT-eindplaat)", met een melding bij
stap 9. In de bestelcode staat dan geen symbool voor stap 6 en 7.

**Gevolg voor de pariteit.** Het browserscenario "volledig ingevuld" koos
MF + ZZ + HT. Dat is nu een ongeldige combinatie; het scenario kiest daarom
de standaard eindplaat. De regel zelf wordt getoetst in
`test/e2e/uitsluitingen.test.ts` (met mutatiecontrole: zonder de regel vallen
drie van de vier UI-tests om).

---

## Fase 2 — inkapseling

### B-002 · Geen viewport-eenheden meer, en waarom dat geen smaakkwestie is

**Aanleiding.** Op de MCA-site (iframe met meegroeiende hoogte) werd de pagina
onnodig lang zodra je onderin de configurator kwam. Eenmalig, daarna stabiel.

**Oorzaak.** `min-height: 100vh` op `:host`, overgenomen uit de `body`-regel van
v1.8. In een iframe die met zijn inhoud meegroeit is `100vh` niet "het venster"
maar de hoogte die de ouderpagina zojuist heeft ingesteld — en die kwam uit de
vórige meting. Daarmee luidt de regel feitelijk:

```
min-height = max(alle eerder gemelde hoogtes)
```

Krimpen is daar per definitie uit weggecodeerd. Zodra stap 12B was verschenen
bleef die hoogte staan, ook nadat de rail weer binnen één deel paste.

**Gemeten** (viewport 1440×900, SBI15 → 9000 mm → terug naar 1200 mm → stap 12
dicht):

| | Piek | Eind | Lege ruimte | Schuifbalk in iframe |
|---|---:|---:|---:|---|
| Met `min-height: 100vh` | 3805 | **3805** | **2240 px** | ja |
| Na de reparatie | 3805 | **1565** | 0 | nee |

**Besluit.** Er staat nergens in dit project nog een viewport-eenheid.

- `min-height: 100vh` is uit `:host` gehaald (patch in `scripts/split-legacy.mjs`).
- Wat die regel feitelijk deed — de achtergrond het venster laten vullen bij
  weinig inhoud — doet nu `html { background: … }` in de gastpagina. De
  achtergrond van het wortelelement propageert naar het canvas en vult het
  venster hoe dan ook, zónder viewport-eenheid.
- De gastpagina kreeg tegelijk `html, body { margin: 0 }`. Sinds de CSS in de
  shadow root zit, raakte de `*`-reset dat document niet meer en hield `<body>`
  zijn 8 px UA-marge — 16 px meer dan het element, en dus een permanente
  schuifbalk in de iframe.

**Verleiding om te weerstaan.** Het ligt voor de hand om `min-height: 100vh`
"gewoon naar de gastpagina te verplaatsen". Doe dat niet: dan bouw je dezelfde
val één niveau hoger opnieuw, zeker in combinatie met melden op
`documentElement.scrollHeight`. Vandaar dat de melding bewust de **elementhoogte**
gebruikt: die volgt uit de inhoud en niet uit wat de ouder zojuist heeft gezet.

**Wat géén oorzaak bleek.** Bij het onderzoek had ik ook de resize-listener in
`legacy-ui.js` (regel 1243, `resize` → `cpCalculate()` → SVG hertekenen) als
mede-oorzaak aangewezen. Nagemeten klopt dat niet: `cpDrawSvg` zet de
SVG-hoogte hard op een constante (`svgH = 175`), dus een resize kan de hoogte
niet veranderen en dus ook geen tweede melding uitlokken. Over de hele doorloop
zijn het 6 meldingen zonder enige oscillatie. De listener is verspilling, geen
lus — die opruimen is een aparte beslissing met een eigen test.

Idem voor `scrollIntoView`: ik verwachtte dat die in een inhoudshoge iframe zou
doorbubbelen naar de pagina eromheen. Gemeten gebeurt dat niet — met
`block: 'nearest'` is elk element in zo'n iframe al "zichtbaar", dus de browser
scrollt niets. Het gevolg is het omgekeerde: in de iframe-route vervalt het
springen naar de volgende stap. Een UX-punt voor fase 4, geen defect.

**Bijvangst.** De CSS-patches in `scripts/split-legacy.mjs` telden niet hoeveel
keer een patroon matchte. `body {` komt vier keer voor in het bronbestand
(`.step-body`, `.step-card.active .step-body`, `.cp-panel .rail-card-body`), en
`String.replace` pakt de eerste — die toevallig de goede was. Nu geankerd op het
regelbegin en met dezelfde faal-bij-niet-precies-1-telling die
`wire-legacy.mjs` al had.

**Vastgelegd in** `test/e2e/iframe-hoogte.test.ts`: krimpt terug, geen
schuifbalk, geen dubbele meldingen, geen viewport-eenheid in de build — plus een
permanente tegenproef die `min-height: 100vh` opnieuw injecteert en aantoont dat
hij dán wél op de piek blijft hangen.

### B-001 · De configurator wordt een custom element met shadow DOM

`<mca-sbi-configurator>` met een open shadow root. De markup en de stylesheet
van v1.8 gaan er letterlijk in; de 162 DOM-opzoekingen zijn gescoopt op die
wortel.

**Waarom.** Dit was de harde blokkade om de tool op de site te zetten. Wat er
zonder inkapseling gebeurt is nagemeten in `test/e2e/embed.test.ts` (derde test,
met de échte CSS van v1.8 in een themapagina):

| | Zonder v1.8-CSS | Met v1.8-CSS |
|---|---|---|
| Site-lettertype | Georgia | **Fugue/Trebuchet** |
| Achtergrond | crème | **grijs** |
| `h2` bovenmarge | 19,92 px | **0 px** |
| `ul` inspringing | 40 px | **0 px** |
| `blockquote` inspringing | 40 px | **0 px** |
| `.header` padding | 32 px | **0 px** |
| `.header` achtergrond | donkerblauw | **wit** |

**Correctie op een eerdere inschatting.** Ik heb gemeld dat de reset "de opmaak
van de hele pagina weghaalt". Dat is te stellig. `*` heeft specificiteit (0,0,0)
en verliest van élke themaregel die een element of class noemt — de `body`-marge
en de alineamarges van het thema bleven in de meting gewoon staan. Wat wél
sneuvelt: de browserstandaarden van alles wat het thema niet expliciet opmaakt
(koppen, lijsten, citaten — dus de hele bodytekst verliest zijn ritme), plus het
lettertype, de achtergrond en elk element met een botsende class-naam. Nog
steeds ernstig genoeg om te blokkeren, maar het is geen totale verwoesting.

**Wat de shadow root oplost:**
- de `*`-reset raakt alleen nog de configurator zelf en mag dus blijven staan;
- `:root` en `body` zijn omgezet naar `:host` (anders matchen ze niets meer);
- ID-botsingen zijn weg: de gastpagina in de test heeft een eigen `#step1`,
  `#codeDisplay` en `#lengthInput` en die blijven onaangeroerd;
- UIkit-stijlen van YOOtheme lekken niet naar binnen — de test zet
  `button { border: 3px dotted }` op de gastpagina en de knoppen in de
  configurator trekken zich er niets van aan.

**Wat nog niet af is.** De 94 inline `onclick`-attributen dwingen af dat 61
functienamen op `window` blijven staan. Daarmee is er nog één instantie per
pagina mogelijk en werkt de tool nog niet onder een strikte CSP. Fase 2c
vervangt ze door gedelegeerde listeners; dan kan dat blok weg.

---

## Bevindingen tijdens fase 0

### V-001 · `cpFindSuggestions` werkt niet voor SBI30, 35, 45 en 65 — vier van de acht modellen

**Ernst: hoog.** Gebruikerszichtbaar, en juist op het moment dat het pijn doet.

`reference/v1.8.html` regel 2849-2869:

```js
const step = F;
const window = maxL * 3;
for (let delta = -window; delta <= window; delta += step) {
    const candidate = desired + delta;
    ...
}
```

De reeks begint op `-window` en stapt met `F`. Alle kandidaten liggen daardoor
op `desired - window (mod F)`. Alleen als `window % F === 0` valt dat samen met
`desired (mod F)` — en dat is precies de restklasse waarin een oplossing kán
liggen, want `cpComputeParts` eist voor élk aantal delen dat
`(totaal − G1 − G2)` deelbaar is door `F`.

| Model | F | maxL | window = maxL·3 | window % F | Suggesties |
|---|---|---|---|---|---|
| SBI15 | 60 | 2960 | 8880 | 0 | werkt |
| SBI20 | 60 | 3960 | 11880 | 0 | werkt |
| SBI25 | 60 | 3960 | 11880 | 0 | werkt |
| **SBI30** | 80 | 3960 | 11880 | **40** | **altijd leeg** |
| **SBI35** | 80 | 3960 | 11880 | **40** | **altijd leeg** |
| **SBI45** | 105 | 3960 | 11880 | **15** | **altijd leeg** |
| SBI55 | 120 | 3960 | 11880 | 0 | werkt |
| **SBI65** | 150 | 3960 | 11880 | **30** | **altijd leeg** |

Reproductie: `cpFindSuggestions(1234, 17, 17, 80, 40, 3960, 289, 5)` geeft `[]`,
terwijl `cpComputeParts(1154, 17, 17, 80, 40, 3960, 289, 1)` een geldige
oplossing teruggeeft — 1154 zit gewoon niet in de doorzochte reeks.

Gevolg: bij SBI30/35/45/65 krijgt de klant "geen geldige verdeling gevonden"
zonder één enkele suggestie om eruit te komen. Bij SBI15/20/25/55 wél. Dat
verklaart waarschijnlijk ook waarom dit nooit is opgevallen: de meest gebruikte
maten (15/20/25) zitten toevallig in de werkende groep.

`step9FindSuggestions` (regel 2192) heeft dit probleem níét: daar is
`window = F * 6`, dus per definitie uitgelijnd.

**Fix (fase 3):** itereer over het aantal stappen in plaats van over een
absolute afstand, zodat de uitlijning niet van `maxL` afhangt:

```js
const maxSteps = Math.ceil((maxL * 3) / F);
for (let k = -maxSteps; k <= maxSteps; k++) {
    const candidate = desired + k * F;
    ...
}
```

Dit verandert de uitvoer voor vier modellen van "leeg" naar "gevuld" — dus de
fixtures `suggestions.cases.jsonl` schuiven mee. Aparte commit, eigen test.

### V-002 · Suggesties kunnen de restklasse nooit verlaten

Ook ná de fix van V-001 geldt: elke kandidaat is `desired + k·F`, dus
`kandidaat mod F` is constant. Omdat `cpComputeParts` eist dat
`(totaal − G1 − G2) % F === 0`, betekent dit dat er **geen enkele suggestie
bestaat zodra `(desired − G1 − G2) % F ≠ 0`** — ongeacht hoe ver je zoekt.

Bij automatische G is dat nooit een probleem (`cpCalcAutoG` kiest G juist zó dat
het opgaat). Bij handmatige G1/G2 is de suggestielijst dan gegarandeerd leeg,
terwijl de klant wél geholpen kan worden door G met één of twee millimeter aan
te passen.

**Overweging voor fase 4:** suggesties niet alleen over lengte doen variëren,
maar ook over G — "1234 mm past bij G = 17 mm" is bruikbaarder dan een lege
lijst. Te bespreken met MCA voordat we dit bouwen; het verandert wat de tool
adviseert.

### V-003 · `cpCalcAutoG` en `cpCalcAutoGDetailed` zijn algebraïsch identiek

Regel 2748 rekent `(L − n·F + F) / 2` bij terugval, regel 2757 rekent
`(L − (n−1)·F) / 2`. Dat is hetzelfde. Gemeten over de volledige sweep van
29.888 gevallen: **0 verschillen**. Ze mogen in v2 samengevoegd worden tot één
functie — geen gedragswijziging, dus geen ADR nodig.

### V-004 · Correctie op het plan: "n = −1" is niet bereikbaar

Het goedgekeurde plan noemt onder defect J dat `cpCalcAutoGDetailed` een
negatief aantal gaten kan teruggeven omdat `Math.max(0, …)` ontbreekt. Gemeten
over de volledige sweep: **0 gevallen met `n < 0`**.

`n = −1` vereist `L < F` én `L/2 < Gmin`, dus `L < 2·Gmin`. De grootste `Gmin`
is 15 (SBI65), dus `L < 30` — ver onder de ondergrens van 100 mm die zowel de
HTML (`min="100"`) als `onLengthInput()` afdwingen. Het is een theoretisch
robuustheidsgat, geen live defect. **Verlaagd van "te repareren" naar "een
guard toevoegen bij het porteren"**; geen aparte fase-3-commit nodig.

### V-007 · `minLast` is afleidbaar: `K + 3·F + Gmin`

**Opgelost.** MCA heeft de herkomst gegeven (vraag 2): de waarden zijn zo
gekozen dat het kortste deel altijd drie bevestigingsgaten heeft.

Die regel reproduceert de tabel exact:

```
minLast = K + 3·F + Gmin        met K = F/2,  dus  minLast = 3,5·F + Gmin
```

| Model | F | Gmin | K | K+3F+Gmin | minLast in v1.8 |
|---|---|---|---|---|---|
| SBI15 | 60 | 6 | 30 | 216 | 216 |
| SBI20 | 60 | 7 | 30 | 217 | 217 |
| SBI25 | 60 | 8 | 30 | 218 | 218 |
| SBI30 | 80 | 9 | 40 | 289 | 289 |
| SBI35 | 80 | 9 | 40 | 289 | 289 |
| SBI45 | 105 | 12 | 52,5 | 379,5 | 379,5 |
| SBI55 | 120 | 14 | 60 | 434 | 434 |
| SBI65 | 150 | 15 | 75 | 540 | 540 |

Acht op acht. Daarmee is `minLast` geen lijst magische getallen meer maar een
regel met een reden.

MCA heeft gezegd dat de wáárden niet mogen veranderen. Dat blijft zo: de tabel
staat letterlijk in `catalog.rails.ts` en wordt door een test vastgezet. De
formule staat er als **controle** naast, niet als vervanging — als iemand ooit
een maat toevoegt of `Gmin` wijzigt, valt de test om zodra de afgeleide waarde
niet meer klopt. Dat is precies de bewaking die ontbrak.

### V-008 · De koppeltekening mist per deel één gat, en een maatlijn is fout gelabeld

**Ernst: hoog.** Deze tekening gaat als bijlage mee in de offerteaanvraag.

Het rekenmodel is ondubbelzinnig: `L = gStart + n·F + gEnd`, waarbij `gStart` de
afstand is van de rand tot het eerste gat en `gEnd` die van het laatste gat tot
de rand. Daaruit volgt dat `n` het aantal **steek-intervallen** is en het aantal
gaten dus `n + 1`.

`cpDrawSvg` tekent er `n` (regel 3199):

```js
for (let h = 0; h < part.n; h++) allHoles.push(cursor + part.gStart + h * F);
```

Het laatste gat komt daardoor op `gStart + (n−1)·F` in plaats van `gStart + n·F`.

Gemeten in de browser, SBI15 @ 9000 mm (4 delen, n = 47/48/48/3):

| | Verwacht | Getekend |
|---|---|---|
| Aantal gaten | 150 | **146** |
| Afstand laatste gat → raileinde | 30 mm | **90 mm** |
| Label op die maatlijn (regel 3209) | `G2=30` | `G2=30` |

De maatlijn zegt dus 30 mm bij een afstand die 90 mm is — precies één steek
ernaast. Ook het gatenpatroon wordt asymmetrisch getekend terwijl de berekening
juist symmetrie afdwingt.

Dezelfde telling zit in de teksten: `${p.n} gaten` (regel 3176) en
`(automatisch, ${n} gaten)` (regel 2227) tellen allebei één te weinig.

**Antwoord MCA (vraag 12):** minimaal 3 gaten bij `minLast`. Met
`minLast = K + 3F + Gmin` is `n = 3`, dus zijn er in werkelijkheid **vier**
gaten. Het minimum wordt dus gehaald, met één gat marge — er is geen conflict.
Alleen de wéérgave klopte niet.

#### Opgelost — vervroegd naar fase 1 op verzoek

Drie gerichte patches, vastgelegd in `scripts/wire-legacy.mjs` zodat ze elke
regeneratie overleven en aanwijsbaar blijven:

| Patch | Wijziging |
|---|---|
| V-008a | `h < part.n` → `h <= part.n` in de tekenlus |
| V-008b | `${p.n} gaten` → `${p.n + 1} gaten` in de deelspecificatie |
| V-008c | idem in de infobalk van stap 12 |

De G2-maatlijn corrigeert zichzelf mee: die wordt vanaf het láátste gat
getekend, en dat is nu het juiste gat.

Gemeten in de browser, SBI15 @ 9000 mm:

| | v1.8 | v2.0 |
|---|---|---|
| Getekende gaten | 146 | **150** |
| Per deel | 47 / 48 / 48 / 3 | **48 / 49 / 49 / 4** |
| Laatste gat → raileinde | 90 mm | **30 mm** (= G2) |

De patches staan als bewuste afwijking in `BEWUSTE_AFWIJKINGEN` in de
browser-pariteitstest, met twee eigen tests die de gecorrigeerde geometrie
vastleggen — inclusief de eis dat elk deel minimaal 3 gaten houdt.

### V-006 · Valkuil bij het toetsen: de koppelstatus staat niet op `window`

Bij het opzetten van de browser-pariteitstest las ik `window.cpCouplingActive`,
`window.cpValid` en `window.cpLastParts` uit. Die zijn **undefined** — het zijn
top-level `let`-declaraties, en die belanden (anders dan `function`-declaraties)
niet op het globale object. Hetzelfde geldt voor `const RAILS` en `selections`.

Gevolg: de test vergeleek stelselmatig `undefined` met `undefined` en verklaarde
de koppelroute groen zónder hem aan te raken. Aan het licht gekomen door een
mutatietest: de zoekrichting in `computeParts` omdraaien liet alle twaalf
scenario's gewoon slagen.

De test leest nu uit wat de klant daadwerkelijk ziet — de gerenderde deellijst,
de uitvoertabel, de SVG-tekening en de zijbalk. Met diezelfde mutatie vallen er
nu vier scenario's om, met een leesbare diff (eerste deel 2880 mm → 180 mm).

**Les voor de rest van het project:** een groene pariteitstest is pas iets waard
als bewezen is dat hij rood kán worden. Elke nieuwe suite krijgt een
mutatiecontrole voordat we erop gaan leunen.

### V-005 · Rails zonder enkel bevestigingsgat worden zonder waarschuwing geaccepteerd

Wél reëel: in **157** van de 29.888 gevallen geeft `cpCalcAutoGDetailed` `n = 0`
terug — een rail waar geen enkel bevestigingsgat in zit. Dat treedt op zodra
`L < F`, dus bij SBI45 (F=105), SBI55 (F=120) en SBI65 (F=150) voor lengtes
vanaf de ondergrens van 100 mm.

De configurator meldt hier niets over; de klant krijgt een geldige bestelcode
voor een rail die niet gemonteerd kan worden. **Voorleggen aan MCA**: is een
rail zonder gaten leverbaar (bijvoorbeeld om zelf te boren), of hoort hier een
waarschuwing? Zie `vragen-aan-MCA.md` vraag 11.
