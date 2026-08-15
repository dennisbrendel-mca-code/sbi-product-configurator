# De configurator op de website plaatsen

Twee routes. Begin met de eerste; de tweede is de terugval als jullie
WordPress-installatie moeilijk doet.

---

## Route 1 — YOOtheme "Custom HTML" (aanbevolen)

### Wat je plakt

`dist/mca-sbi-configurator-embed.html` — 98 kB, één element plus één script:

```html
<mca-sbi-configurator></mca-sbi-configurator>
<script type="module"> …de hele configurator… </script>
```

Er hoort géén losse stylesheet bij. Alle opmaak zit in de shadow root van het
element, dus er valt niets te vergeten en niets te lekken.

### Stappen

1. Bouw de laatste versie:
   ```bash
   cd sbi-configurator
   npm run build
   ```
2. Zet de inhoud op je klembord:
   ```bash
   pbcopy < dist/mca-sbi-configurator-embed.html
   ```
3. In YOOtheme: voeg op de pagina een **Custom HTML**-element toe (bij sommige
   versies heet dit "HTML" of "Code").
4. Plak, sla op, en bekijk de **gepubliceerde pagina** — niet alleen de preview
   in de builder (zie de valkuilen hieronder).

### Waar de configurator ruimte nodig heeft

Zet het element in een sectie op **volle breedte** zonder extra kolommen. De
layout is binnen zichzelf responsive: boven 900 px staat de zijbalk rechts,
daaronder komt alles onder elkaar. In een smalle kolom van bijvoorbeeld 400 px
werkt hij wel, maar dan zie je de mobiele indeling op een desktop.

---

## Route 2 — als losstaand bestand in een iframe

Als route 1 niet lukt: upload `dist/mca-sbi-configurator.html` naar de server
(bijvoorbeeld `/wp-content/uploads/tools/`) en zet in een Custom HTML-element
een van de twee varianten hieronder.

### Wat je in deze route opgeeft

Een iframe die met zijn inhoud meegroeit heeft **geen eigen scrollgebied**.
`position: sticky` op de zijbalk heeft dan niets om aan te plakken, dus het
paneel met de bestelcode en het specificatieoverzicht scrollt gewoon weg zodra
je naar beneden gaat. Gemeten: in route 1 blijft de zijbalk op 28 px van de
vensterrand staan; in een meegroeiende iframe verdwijnt hij 855 px boven beeld.

Dat is geen instelling maar een gevolg van hoe `sticky` werkt, en niet met CSS
te repareren. Wil je de bestelcode in beeld houden, kies dan variant A of ga
terug naar route 1.

Ook vervalt in deze route het automatisch doorspringen naar de volgende stap:
in een iframe op inhoudshoogte is elk element altijd al "zichtbaar", dus de
browser scrollt niets.

### Variant A — vaste hoogte (zijbalk blijft werken)

```html
<iframe
  id="sbi-configurator"
  src="/wp-content/uploads/tools/mca-sbi-configurator.html"
  style="width:100%;border:0;height:min(900px, 85vh)"
  title="SBI bestelcode-configurator"
  loading="lazy"
  allow="clipboard-write"></iframe>
```

De configurator scrollt binnen zijn eigen venster, dus de zijbalk plakt zoals
bedoeld. Nadeel: scrollen binnen scrollen, wat op mobiel onhandig kan zijn.

### Variant B — meegroeiend (één doorlopende pagina, geen plakkende zijbalk)

```html
<iframe
  id="sbi-configurator"
  src="/wp-content/uploads/tools/mca-sbi-configurator.html"
  style="width:100%;border:0;height:1400px"
  title="SBI bestelcode-configurator"
  loading="lazy"
  allow="clipboard-write"></iframe>

<script>
(function () {
  var iframe = document.getElementById('sbi-configurator');
  var vorige = 0;
  window.addEventListener('message', function (e) {
    // Alleen berichten van déze iframe — niet van een andere widget op de pagina.
    if (e.source !== iframe.contentWindow) return;
    if (!e.data || e.data.type !== 'mca-sbi-configurator:hoogte') return;

    var h = e.data.hoogte;
    if (typeof h !== 'number' || !Number.isFinite(h)) return;

    // Ruime grenzen: 5100 px is een normale waarde op mobiel. De ondergrens
    // voorkomt dat een fout bericht de configurator laat verdwijnen.
    h = Math.min(Math.max(h, 400), 20000);
    if (h === vorige) return;
    vorige = h;
    iframe.style.height = h + 'px';
  });
})();
</script>
```

De `height:1400px` in de stijl blijft staan als terugval voor het geval het
script eruit gefilterd wordt. Laat hem er dus in.

Let op `allow="clipboard-write"` — zonder dat werkt de kopieerknop niet.

---

## Controlelijst na plaatsen

Loop dit af op de gepubliceerde pagina, niet in de builder.

**De pagina eromheen**
- [ ] Menu, footer en zijbalken zien er nog hetzelfde uit als op een andere pagina
- [ ] Koppen, opsommingen en tekstblokken hebben hun normale ruimte
- [ ] Het lettertype en de achtergrondkleur van de site zijn ongewijzigd

**De configurator zelf**
- [ ] Alle 15 stappen staan er, stap 1 staat open
- [ ] Een stap open- en dichtklikken werkt
- [ ] Model kiezen vult de bestelcode rechts
- [ ] Raillengte 9000 mm bij SBI15 → stap 12B verschijnt met vier delen
- [ ] De tekening in stap 12B toont gaten en maatlijnen
- [ ] "Kopieer bestelcode" werkt (vereist HTTPS)
- [ ] Op een telefoon: alles onder elkaar, geen horizontale schuifbalk
- [ ] **De pagina wordt weer korter**: voer 9000 mm in, zet hem daarna terug op
      1200 mm en klap stap 12 dicht. De lege ruimte onderaan hoort mee te
      krimpen. (Dit ging eerder mis — zie `decisions.md` B-002.)
- [ ] Bij route 1: het bestelcodepaneel blijft in beeld terwijl je naar beneden
      scrollt. Blijft het niet plakken, kijk dan of een YOOtheme-sectie eromheen
      `overflow: hidden` of `clip` zet — dat schakelt `sticky` uit.

**De offerteaanvraag**
- [ ] Alle stappen invullen → de knop wordt actief
- [ ] Klikken opent je mailprogramma met de bestelcode in het onderwerp
- [ ] Bij een gekoppelde rail: controleer of de mailtekst compleet is en niet
      halverwege afbreekt — dit is precies het probleem waar het REST-endpoint
      voor bedoeld is (zie vraag 11)

---

## Valkuilen die ik verwacht

**Je ziet niets in de YOOtheme-builder, wel op de gepubliceerde pagina.**
De builder laadt onderdelen via AJAX en voegt HTML toe met `innerHTML`. Scripts
die zo worden ingevoegd voert de browser niet uit — dat is een regel van de
browser, niet iets wat wij kunnen omzeilen. Beoordeel dus altijd de echte pagina.

**Je ziet helemaal niets, ook niet op de gepubliceerde pagina.**
Waarschijnlijk is het `<script>` eruit gefilterd. Dat gebeurt als je bent
ingelogd als een rol zonder `unfiltered_html` (alles behalve beheerder op een
enkele site, of superbeheerder op multisite), of door een securityplugin als
Wordfence. Controleer de broncode van de pagina: staat het script er nog?
Zo niet → route 2.

**Er verschijnt een blok met code in plaats van de configurator.**
Dan is het HTML-element als platte tekst behandeld. Gebruik het Custom
HTML/Code-element, niet een tekst- of alinea-element.

**De kopieerknop doet niets.**
`navigator.clipboard` vereist HTTPS. Op een staging-omgeving zonder certificaat
werkt hij niet; dat is geen fout in de configurator.

**Het lettertype ziet er anders uit dan verwacht.**
Alleen buiten mcabv.nl. De configurator vraagt om Fugue maar laadt het niet
zelf. Dat hoeft ook niet op de site: `@font-face` is documentbreed en werkt
gewoon door in een shadow root — nagemeten, dezelfde renderbreedte binnen en
buiten (338,09 px met Fugue tegen 365,19 px met Trebuchet MS). Op mcabv.nl,
waar Fugue via `/wp-content/uploads/useanyfont/6526Fugue.woff2` al geladen is,
staat hij dus meteen goed.

In het losse bestand, in een iframe of op een omgeving zonder dat lettertype
valt hij terug op Trebuchet MS. Alleen daarvoor is het insluiten van een
gesubsette woff2 nog nuttig (fase 4).

---

## Wat je terugkoppelt

Als er iets misgaat, heb ik hieraan het meeste:

1. De URL van de pagina
2. Een schermafbeelding van wat je ziet
3. De console van de browser (rechtermuisknop → Inspecteren → Console) — rode
   regels zijn interessant
4. Of het script nog in de broncode staat (Ctrl/Cmd + U, zoek op
   `mca-sbi-configurator`)
