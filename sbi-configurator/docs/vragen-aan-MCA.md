# Vragen aan MCA

Deze vragen blokkeren de bouw niet — het gedrag blijft tot ze beantwoord zijn
exact zoals v1.8 het doet. Ze bepalen wél wat er in fase 3 en 4 gebeurt.

Op volgorde van belang.

---

### 1. Lengtesuggesties werken bij vier van de acht modellen niet

Bij **SBI30, SBI35, SBI45 en SBI65** geeft de configurator nóóit een
lengtesuggestie, ook niet als er prima alternatieven bestaan. Bij SBI15, 20, 25
en 55 werkt het wel. Oorzaak gevonden en te repareren (zie `decisions.md` V-001).

**Vraag:** is dit ooit gemeld door klanten of verkoop? En: mag ik dit in fase 3
repareren — de tool gaat dan bij die vier maten opeens suggesties tonen waar hij
nu zwijgt.

### 2. Waar komt `minLast` vandaan?

De waarden **216 / 217 / 218 / 289 / 289 / 379,5 / 434 / 540** (minimale lengte
van het laatste, op maat gezaagde deel) staan niet in `SBI maatgegevens
(absoluut).xlsx` en ik vind ze niet terug in de catalogus.

**Vraag:** wie is de eigenaar van deze getallen en waarop zijn ze gebaseerd?
Zonder bron kunnen we ze nooit verantwoorden of bijwerken. Tot die tijd blijven
ze exact zoals ze zijn, vastgezet met een test.

### 3. Stap 8 spreekt zichzelf tegen

De omschrijving zegt *"Geen symbool = 1 loopwagen per rail"* en het knoplabel
zegt *"1 loopwagen (geen symbool)"* — maar de code zet een `1` in de bestelcode.
Stap 14 doet het bij "1 rail" wél met een leeg veld.

**Vraag:** hoort `SBI20-FL-1-K1-…` of `SBI20-FL-K1-…`? Ik wijzig hier niets
zonder antwoord.

### 4. Rails zonder bevestigingsgaten

Bij SBI45, 55 en 65 kan een korte rail (vanaf de ondergrens van 100 mm) uitkomen
op **nul** bevestigingsgaten. De configurator waarschuwt daar niet over.

**Vraag:** is dat leverbaar, of hoort daar een blokkade of waarschuwing?

### 5. Maximale raillengte: 2960/3960 of 3000/4000?

De xlsx noemt 2960 (SBI15) en 3960 (overige) als "Max. raillengte"; de catalogus
noemt bij `L0 max` 3000 respectievelijk 4000.

**Vraag:** is 2960/3960 een bewuste veiligheidsmarge (zaagverlies?), of is een
van beide verouderd?

### 6. Bloktype-matrix: welke types in welke maten?

De bronnen spreken elkaar tegen:

| Bron | Wat het zegt |
|---|---|
| v1.8 (huidig) | FLS/SLS/HLS alleen 15-35; CLS alleen 20; overige tien types onbeperkt |
| Catalogus V13-2019 (p7/p8) | noemt FLS en SLS helemaal niet |
| SBC Linear (leverancier) | voert FLS/SLS/HLS/CLS wel, als "Short Block Length" |
| SBC-USA | FL-familie 15-30 · CL 20/25 · SL 15-25 · FV 15-25 · HL 15/25 · SV 15-25 |

**Vraag:** kun je de leverancier om de actuele matrix vragen? Tot die tijd
blijven de vier bestaande beperkingen ongewijzigd en voegen we niets toe.

### 7. Optie `-B` (railmontage van onderaf)

Catalogus p21 geeft `-B` een eigen **G min. van 20 mm** (22,5 bij SBI45) en kent
geen SBI55-B/65-B. De configurator gebruikt bij `-B` nog steeds de gewone Gmin
van 6-15 mm.

Jij gaf aan dit voorlopig te laten zoals het is, dus daar houd ik me aan.
**Vraag ter bevestiging:** klopt de catalogus hier, of is de huidige tool
leidend? Als de catalogus klopt, rekent de tool op dit moment te kleine
eindmaten bij elke `-B`-configuratie.

### 8. Nauwkeurigheidsklasse `N`

De catalogus kent N (Normal), H (High, voorkeur) en P (Precision). De tool biedt
alleen H en P.

**Vraag:** bewust weggelaten omdat MCA geen N levert?

### 9. Canoniek codeformaat

De catalogus schrijft `SBI20 FL - N - MF - ZZ - 2 - K1 - HT - 800 - H - FCR - B - G1/G2 - II`
(spatie na het model, spaties rond de streepjes). De tool produceert
`SBI20-FL-N-MF-ZZ-2-K1-HT-800-H-FCR-B-20/20-II`.

**Vraag:** welk formaat moet de kopieerknop opleveren? Dit gaat rechtstreeks in
jullie ordersysteem, dus het luistert nauw.

### 10. Rail zonder loopwagen

Catalogus p7 kent daarvoor een eigen 5-velds formaat mét `L`-achtervoegsel:
`SBI20 - 1200L - B - FCR - 20/20`. De tool laat nu simpelweg de lege velden weg
uit het 14-velds formaat.

**Vraag:** moet de "geen loopwagen"-route het 5-velds formaat produceren?

### 11. Techniek — voor jullie IT

- Mag er een must-use plugin met een REST-endpoint op de site (±30 regels PHP)
  die de offerteaanvraag valideert, opslaat en mailt naar `linear@mcabv.nl`?
  De huidige `mailto:`-route kapt bij gekoppelde rails af (>2000 tekens) en
  faalt stil — er gaan waarschijnlijk nu al aanvragen verloren.
- Hoeveel offerteaanvragen komen er feitelijk binnen via de configurator,
  afgezet tegen het aantal bezoeken? Dat vertelt of punt 1 hierboven klopt.
- Is er een woff2-bestand met weblicentie voor het huislettertype **Fugue**? De
  CSS vraagt er 39 keer om maar laadt het nergens, dus de tool draait vandaag in
  Trebuchet MS.
