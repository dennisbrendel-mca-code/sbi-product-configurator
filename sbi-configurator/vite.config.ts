import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** De oplevering heet zoals hij op de site komt te staan, niet 'index.html'. */
const OUTPUT_NAAM = 'mca-sbi-configurator.html';
/** Kale variant om in een Custom HTML-blok te plakken. */
const EMBED_NAAM = 'mca-sbi-configurator-embed.html';

function hernoemOutput(): Plugin {
  return {
    name: 'mca-hernoem-output',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') throw new Error('index.html ontbreekt in de bundel');
      delete bundle['index.html'];
      html.fileName = OUTPUT_NAAM;
      bundle[OUTPUT_NAAM] = html;

      // ── Plakbare variant ────────────────────────────────────────────────
      // YOOtheme's "Custom HTML" wil een fragment, geen heel document. Omdat
      // alles in de shadow root van het element zit, is dat fragment niet meer
      // dan het element plus het script — er is geen losse stylesheet die mee
      // moet, en er valt niets te lekken.
      const bron = String(html.source);
      const script = bron.match(/<script type="module"[^>]*>[\s\S]*?<\/script>/);
      if (!script) throw new Error('Geen inline module-script gevonden om te plakken');

      this.emitFile({
        type: 'asset',
        fileName: EMBED_NAAM,
        source:
          `<!--\n` +
          `  MCA SBI bestelcode-configurator — plakversie voor YOOtheme "Custom HTML".\n` +
          `\n` +
          `  Plak dit hele blok in een Custom HTML-element. De configurator zit\n` +
          `  volledig in de shadow root van het custom element, dus hij kan de\n` +
          `  opmaak van de pagina niet raken en de pagina de zijne niet.\n` +
          `\n` +
          `  Gegenereerd door de build — niet met de hand aanpassen.\n` +
          `-->\n` +
          `<mca-sbi-configurator></mca-sbi-configurator>\n` +
          script[0] +
          `\n`,
      });
    },
  };
}

/**
 * De oplevering is altijd één zelfstandig HTML-bestand dat je kunt uploaden.
 * `viteSingleFile` inlinet daarvoor alle JS en CSS; `assetsInlineLimit`
 * hieronder zorgt dat ook eventuele afbeeldingen en fonts meegaan als data-URI,
 * zodat het bestand geen enkele externe request meer doet.
 */
export default defineConfig({
  plugins: [viteSingleFile(), hernoemOutput()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Geen aparte chunks: alles moet in het ene HTML-bestand passen.
    cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024,
    // Leesbare uitvoer helpt bij het beoordelen van wat er daadwerkelijk
    // geüpload wordt; de winst van minificatie is hier beperkt.
    minify: 'esbuild',
    target: 'es2022',
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
