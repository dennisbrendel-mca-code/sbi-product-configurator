import legacyCss from './ui/styles/legacy.css?inline';
import { LEGACY_MARKUP } from './ui/legacy-markup';
import { initLegacyUI } from './ui/legacy-ui.js';

/**
 * De configurator als custom element.
 *
 * Alles zit in een shadow root. Dat is geen vormfout maar de kern van de
 * oplossing: v1.8 opende met `* { margin:0; padding:0 }` en een `body`-regel
 * zonder scope. Geplakt in een WordPress-pagina haalt dat de opmaak van de hele
 * site weg. Andersom lekken de UIkit-stijlen van YOOtheme naar binnen en wordt
 * elke visuele aanpassing een gevecht met een thema dat we niet beheren.
 *
 * Een shadow root sluit beide richtingen af. De `*`-reset mag daardoor gewoon
 * blijven staan.
 *
 * Gebruik:
 *
 *     <mca-sbi-configurator></mca-sbi-configurator>
 *
 * Werkt zowel als losse pagina als geplakt in een bestaande site.
 */
export class McaSbiConfigurator extends HTMLElement {
  /** Bewaakt dat de UI hoogstens één keer per element opstart. */
  #gestart = false;

  connectedCallback(): void {
    if (this.#gestart) return;
    this.#gestart = true;

    const root = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = legacyCss;

    const houder = document.createElement('div');
    houder.innerHTML = LEGACY_MARKUP;

    root.append(style, ...Array.from(houder.childNodes));

    initLegacyUI(root);
    this.#meldHoogte();
  }

  /**
   * Meldt de eigen hoogte aan een bovenliggend venster.
   *
   * Alleen relevant als de configurator in een iframe wordt ingebed — dan kan
   * de pagina eromheen meegroeien in plaats van een scrollbalk te tonen. Buiten
   * een iframe doet dit niets.
   */
  #meldHoogte(): void {
    if (window.self === window.top) return;

    const stuur = () => {
      const hoogte = Math.ceil(this.getBoundingClientRect().height);
      window.parent.postMessage({ type: 'mca-sbi-configurator:hoogte', hoogte }, '*');
    };

    // ResizeObserver vangt ook het uitklappen van stapkaarten en het verschijnen
    // van stap 12B — precies de momenten waarop de hoogte springt. Sinds Safari
    // 13.1 overal aanwezig; de terugval is er voor oudere zakelijke browsers.
    const Observer = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    if (Observer) {
      new Observer(stuur).observe(this);
    } else {
      window.addEventListener('resize', stuur);
    }
    stuur();
  }
}

/** Registreert het element. Dubbel registreren is een harde fout in de browser. */
export function registreer(naam = 'mca-sbi-configurator'): void {
  if (!customElements.get(naam)) {
    customElements.define(naam, McaSbiConfigurator);
  }
}
