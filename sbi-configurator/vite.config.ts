import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** De oplevering heet zoals hij op de site komt te staan, niet 'index.html'. */
const OUTPUT_NAAM = 'mca-sbi-configurator.html';

function hernoemOutput(): Plugin {
  return {
    name: 'mca-hernoem-output',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (!html) throw new Error('index.html ontbreekt in de bundel');
      delete bundle['index.html'];
      html.fileName = OUTPUT_NAAM;
      bundle[OUTPUT_NAAM] = html;
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
