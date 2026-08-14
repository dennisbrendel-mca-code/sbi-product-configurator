# MCA SBI bestelcode-configurator — v2

Herbouw van `Claude output/mca-railgeleiding-configurator-v1.8.html` naar iets
dat op de MCA-website kan draaien en dat je zonder angst kunt uitbreiden.

De harde eis: **het gedrag van v1.8 blijft behouden.** Daar is dit hele project
omheen gebouwd — zie "Golden master" hieronder.

## Commando's

```bash
npm install
npm test              # golden master + domeintests
npm run golden:capture   # fixtures opnieuw vastleggen — ALLEEN bij een bewuste gedragswijziging
npm run dev           # ontwikkelserver (vanaf fase 1)
npm run build         # -> dist/mca-sbi-configurator.html, één zelfstandig bestand
```

## Golden master

`reference/v1.8.html` is een bevroren, read-only kopie van de werkende
configurator (SHA-256 `4419952c…`). `test/tools/extract-legacy.mjs` laadt hem in
jsdom en haalt het rekenhart eruit — dat kan precies omdát v1.8 al zijn functies
globaal zet.

`test/golden/` legt vast wat dat rekenhart doet:

| Fixture | Gevallen |
|---|---:|
| `autog.sweep.json` — elke mm van 100 t/m maxL, 8 modellen | 29.888 |
| `parts.sweep.json` — verdelingen tot 3× maxL, 1-6 delen | 92.582 |
| `autonumparts.sweep.json` | 7.025 |
| `buildcode.cases.jsonl` — willekeurige selectiestaten | 5.000 |
| `parts.cases.jsonl` — grensgevallen, leesbaar | 4.000 |
| `autog.cases.jsonl` — Gmin-terugval en bereikranden | 6.836 |
| `suggestions.cases.jsonl` | 264 |
| `step9suggestions.cases.jsonl` | 56 |

De grote sweeps worden als SHA-256 vastgelegd; de grensgevallen staan leesbaar
in JSONL zodat een falende test *toont* wat er misging in plaats van alleen
"hash mismatch".

Het harnas is op gevoeligheid getoetst: een afwijking van 0,001 mm in één
uitkomst, een omgedraaide deelvolgorde en `null` versus `[]` geven alle drie een
andere hash.

**De fixtures leggen vast wat v1.8 dóét, niet wat het zou moeten doen.** Bekende
defecten zitten er bewust in. Ze worden per stuk gewijzigd, met een ADR in
`docs/decisions.md`.

## Documentatie

- `docs/decisions.md` — elke bewuste gedragswijziging, met bron
- `docs/vragen-aan-MCA.md` — openstaande vragen die het gedrag bepalen
- Het volledige plan staat in `~/.claude/plans/deze-configurator-die-je-eager-balloon.md`

## Stand van zaken

- [x] **Fase 0** — vastleggen: git, v1.8 bevroren, golden fixtures, harnas getoetst
- [ ] **Fase 1** — Vite/TS-toolchain, rekenhart verbatim porteren, gedrag aantoonbaar identiek
- [ ] Fase 2 — datagedreven herbouw (Preact, shadow DOM, tokens, toegankelijkheid)
- [ ] Fase 3 — defecten repareren
- [ ] Fase 4 — UX en maatvoeringstekening
- [ ] Fase 5 — deellink, concepten, A4-datasheet
- [ ] Fase 6 — verzending via WordPress REST-endpoint
- [ ] Fase 7 — hardening en overdracht
