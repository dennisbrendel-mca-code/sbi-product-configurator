# Vragen aan MCA

**Stand: 14 augustus 2026 — vragen 1 t/m 11 beantwoord door Dennis Brendel.**
De antwoorden staan hieronder ongewijzigd, met daaronder wat ermee gedaan is.
Vraag 12 is nieuw en volgt uit het antwoord op vraag 2.

---

### 1. Lengtesuggesties werken bij vier van de acht modellen niet

Bij **SBI30, SBI35, SBI45 en SBI65** geeft de configurator nóóit een
lengtesuggestie, ook niet als er prima alternatieven bestaan. Bij SBI15, 20, 25
en 55 werkt het wel. Oorzaak gevonden en te repareren (zie `decisions.md` V-001).

**Antwoord:** lengtesuggesties mogen gegeven worden bij alle varianten, alleen
dit hoeft niet op te vallen.

> **Verwerkt:** V-001 wordt in fase 3 gerepareerd (itereren over het aantal
> stappen in plaats van over een absolute afstand). De suggesties verschijnen
> dan bij alle acht maten, in dezelfde vormgeving als nu — geen banner, geen
> "nieuw"-melding. Voor de klant ziet het eruit alsof het altijd zo werkte.

### 2. Waar komt `minLast` vandaan?

**Antwoord:** minLast mag niet veranderd worden. Deze waarden hebben wij gegeven
zodat de kleinste rail, dus de kortste maat, altijd drie bevestigingsgaten
heeft. Dus laat deze data staan.

> **Verwerkt — en dit leverde een regel op.** De acht waarden blijken exact te
> volgen uit `minLast = K + 3·F + Gmin` (met K = F/2), op alle acht modellen tot
> op de halve millimeter. Zie `decisions.md` V-007.
>
> De waarden blijven letterlijk staan zoals gevraagd. De formule staat er als
> bewaking naast: een test vergelijkt beide, zodat het opvalt als iemand ooit
> `Gmin` of `F` wijzigt zonder `minLast` mee te nemen. Dat gat bestond tot nu toe.

### 3. Stap 8 spreekt zichzelf tegen

**Antwoord:** geen symbool heeft te maken met de code die hij genereert, dus in
de bestelcode komt dan geen één te staan.

> **Verwerkt:** in fase 3 wordt stap 8 "1 loopwagen" een leeg codeveld, net
> zoals stap 14 dat bij "1 rail" al doet. `SBI20-FL-K1-…` dus, niet
> `SBI20-FL-1-K1-…`. Dit verandert de uitvoer, dus eigen commit met ADR en
> verschuivende golden fixtures.

### 4. Rails zonder bevestigingsgaten

**Antwoord:** waarschuwing, maar zie antwoord bij vraag 2.

> **Verwerkt:** wordt een waarschuwing, geen blokkade. Met het antwoord op
> vraag 2 erbij ligt de drempel voor de hand: waarschuw zodra een rail korter is
> dan `minLast`, want dat is precies de grens waaronder de zaagregel van drie
> gaten niet meer gehaald wordt. Die grens gold tot nu toe alleen voor het
> laatste deel van een gekoppelde rail, niet voor een gewone losse rail.

### 5. Maximale raillengte: 2960/3960 of 3000/4000?

**Antwoord:** dit is een bewuste veiligheidsmarge voor zaagverlies, dus niet
aankomen, laten staan.

> **Verwerkt:** blijft 2960/3960. Vastgelegd met bron in `catalog.rails.ts`,
> zodat niemand het later "corrigeert" naar de catalogusgetallen.

### 6. Bloktype-matrix: welke types in welke maten?

**Antwoord:** laten zoals het is.

> **Verwerkt:** de vier bestaande beperkingen (FLS/SLS/HLS bij 15-35, CLS bij
> 20) blijven ongewijzigd; er komt niets bij. De matrix wordt wel data in plaats
> van HTML-attributen, zodat een toekomstige wijziging één regel is.

### 7. Optie `-B` (railmontage van onderaf)

**Antwoord:** op dit moment is de tool leidend.

> **Verwerkt:** geen wijziging aan `Gmin` bij `-B`. Wel vastgelegd dat de
> catalogus hier iets anders zegt, zodat het terugvindbaar is als het ooit
> alsnog blijkt te knellen.

### 8. Nauwkeurigheidsklasse `N`

**Antwoord:** ja, bewust.

> **Verwerkt:** blijft H en P. Genoteerd als bewuste keuze, niet als omissie.

### 9. Canoniek codeformaat

**Antwoord:** maakt niet zoveel uit. Laat het voor nu maar staan.

> **Verwerkt:** blijft `SBI20-FL-N-…` met kale streepjes.

### 10. Rail zonder loopwagen

**Antwoord:** zolang dit geen problemen levert bij de gekoppelde rails.

> **Verwerkt:** blijft het uitgeklede 14-velds formaat. De "geen
> loopwagen"-route en de koppelroute staan los van elkaar — het weglaten van
> lege velden gebeurt pas bij het samenstellen van de code en raakt de
> berekening niet. De browsertest dekt de combinatie af.

### 11. Techniek — voor jullie IT

- **REST-endpoint:** *op dit moment nog onbekend.*
  > **Verwerkt:** de verzending komt achter één `QuoteTransport`-interface met
  > `mailto` als startimplementatie. Overschakelen naar een endpoint is later
  > een configuratievlag, geen herbouw. Ondertussen wordt de mailto-route wel
  > robuuster gemaakt (body kort houden, lengte meten en waarschuwen, echte
  > link in plaats van `location.href`, en altijd "kopieer aanvraagtekst").
- **Aantal aanvragen:** *dit weten we niet.*
  > **Verwerkt:** geen meting mogelijk, dus we gaan uit van het slechtste geval.
  > Reden te meer om niet op mailto te blijven leunen.
- **Lettertype Fugue:** *we hebben dit lettertype op onze website staan.*
  > **Verwerkt:** gevonden op
  > `https://www.mcabv.nl/wp-content/uploads/useanyfont/6526Fugue.woff2` —
  > 30,7 kB, **alleen gewicht 400**. De configurator gebruikt halfvet en vet;
  > die worden dus door de browser nagebootst, net als op de rest van de site.
  > Plan voor fase 4: subsetten (de tool heeft alleen Latijn plus een handvol
  > tekens nodig) en inline zetten als data-URI, zodat het bestand zelfstandig
  > blijft. Zie vraag 13.

---

## Nieuwe vragen

### 12. Drie of vier bevestigingsgaten?

Volgt rechtstreeks uit het antwoord op vraag 2, en er zit een telfout tussen.

Het rekenmodel is `L = G1 + n·F + G2`, waarbij `n` het aantal **steken** is. Het
aantal gaten is dan `n + 1`. De tool toont overal `n` en tekent er ook `n` — dus
consequent één te weinig (zie `decisions.md` V-008).

Met `minLast = K + 3·F + Gmin` komt `n` op 3 uit. Dat betekent:

- de tool **toont** "3 gaten" — wat aansluit bij jullie omschrijving;
- er zitten in werkelijkheid **4 gaten** in dat kortste deel.

**Vraag:** wat was de bedoeling — minimaal 3 gaten (dan klopt `minLast` en is
alleen de weergave fout) of minimaal 4 (dan klopt alles al en is alleen de
telling misleidend)? In beide gevallen blijven de waarden ongewijzigd; het
bepaalt alleen hoe we het straks tonen.

**antwoorden:** minimaal 3 gaten bij minlast.

### 13. Mag het lettertype in het bestand?

De configurator wordt één zelfstandig HTML-bestand. Om Fugue te tonen zonder
externe request moet het lettertype als data-URI in dat bestand — ongeveer
15 kB na subsetten.

**Vraag:** is de licentie van Fugue daarvoor toereikend? Het gaat om dezelfde
site en hetzelfde gebruik als nu, alleen ingesloten in plaats van opgehaald.
Zo niet, dan verwijzen we naar de URL op jullie server met een nette terugval.

**antwoorden:** ja
