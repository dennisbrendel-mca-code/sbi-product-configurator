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
(bijvoorbeeld `/wp-content/uploads/tools/`) en zet in een Custom HTML-element:

```html
<iframe
  src="/wp-content/uploads/tools/mca-sbi-configurator.html"
  style="width:100%;border:0;height:1400px"
  title="SBI bestelcode-configurator"
  loading="lazy"
  allow="clipboard-write"></iframe>
```

Let op `allow="clipboard-write"` — zonder dat werkt de kopieerknop niet.

Het element meldt zijn hoogte aan de pagina eromheen, dus je kunt de iframe
laten meegroeien in plaats van een vaste hoogte te kiezen:

```html
<script>
window.addEventListener('message', (e) => {
  if (e.data?.type === 'mca-sbi-configurator:hoogte') {
    document.querySelector('iframe[title="SBI bestelcode-configurator"]')
      .style.height = e.data.hoogte + 'px';
  }
});
</script>
```

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
