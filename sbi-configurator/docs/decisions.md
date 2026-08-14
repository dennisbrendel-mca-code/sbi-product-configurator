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

### V-005 · Rails zonder enkel bevestigingsgat worden zonder waarschuwing geaccepteerd

Wél reëel: in **157** van de 29.888 gevallen geeft `cpCalcAutoGDetailed` `n = 0`
terug — een rail waar geen enkel bevestigingsgat in zit. Dat treedt op zodra
`L < F`, dus bij SBI45 (F=105), SBI55 (F=120) en SBI65 (F=150) voor lengtes
vanaf de ondergrens van 100 mm.

De configurator meldt hier niets over; de klant krijgt een geldige bestelcode
voor een rail die niet gemonteerd kan worden. **Voorleggen aan MCA**: is een
rail zonder gaten leverbaar (bijvoorbeeld om zelf te boren), of hoort hier een
waarschuwing? Zie `vragen-aan-MCA.md` vraag 11.
