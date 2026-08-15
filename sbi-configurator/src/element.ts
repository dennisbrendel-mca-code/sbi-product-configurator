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

  #observer: ResizeObserver | null = null;
  #frame = 0;
  /** Laatst verstuurde hoogte, zodat identieke berichten achterwege blijven. */
  #laatsteHoogte = -1;
  /** Recente hoogtes — alleen om een terugkoppeling te kúnnen herkennen. */
  #historie: number[] = [];
  #gestopt = false;

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

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  /**
   * Meldt de eigen hoogte aan een bovenliggend venster.
   *
   * Alleen relevant als de configurator in een iframe wordt ingebed — dan kan
   * de pagina eromheen meegroeien in plaats van een schuifbalk te tonen. Buiten
   * een iframe doet dit niets.
   *
   * Gemeten wordt de hoogte van het **element**, niet
   * `documentElement.scrollHeight`. Dat is bewust: de elementhoogte volgt uit
   * de inhoud, terwijl de documenthoogte mede bepaald wordt door wat de
   * ouderpagina zojuist heeft ingesteld. Dat laatste meten zou de meting laten
   * terugkoppelen op zijn eigen uitkomst — precies het soort lus dat deze
   * configurator eerder liet vastlopen op zijn hoogste stand.
   */
  #meldHoogte(): void {
    if (window.self === window.top) return;

    const doel = this.getAttribute('data-parent-origin') || '*';

    const stuur = () => {
      this.#frame = 0;
      if (this.#gestopt) return;

      const hoogte = Math.ceil(this.getBoundingClientRect().height);
      if (hoogte === this.#laatsteHoogte) return;

      // Geen hysterese: een drempel zou juist de kleine, terechte krimp
      // maskeren die we willen doorgeven. Wel een noodrem, zodat een
      // gastpagina die zelf hoogte toevoegt niet tot in het oneindige heen en
      // weer kaatst — en zodat je dán ziet waaróm.
      this.#historie.push(hoogte);
      if (this.#historie.length > 12) this.#historie.shift();
      const uniek = new Set(this.#historie);
      if (this.#historie.length === 12 && uniek.size <= 2) {
        this.#gestopt = true;
        console.warn(
          '[mca-sbi-configurator] De hoogte kaatst heen en weer tussen ' +
            [...uniek].join(' en ') +
            ' px. Melden gestopt. Waarschijnlijk voegt de pagina eromheen hoogte ' +
            'toe aan de iframe (rand, padding) of staat er een min-height op.'
        );
        return;
      }

      this.#laatsteHoogte = hoogte;
      window.parent.postMessage({ type: 'mca-sbi-configurator:hoogte', hoogte }, doel);
    };

    // Alle wijzigingen binnen één frame worden tot één bericht gebundeld.
    // requestAnimationFrame en niet een timer: ResizeObserver vuurt vóór paint,
    // dus dit is nog in hetzelfde frame klaar en voegt geen zichtbare
    // vertraging toe bij het uitklappen van een stap.
    const plan = () => {
      if (this.#frame) return;
      this.#frame = requestAnimationFrame(stuur);
    };

    // ResizeObserver vangt ook het uitklappen van stapkaarten en het verschijnen
    // van stap 12B — precies de momenten waarop de hoogte springt. Sinds Safari
    // 13.1 overal aanwezig; de terugval is er voor oudere zakelijke browsers.
    const Observer = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    if (Observer) {
      this.#observer = new Observer(plan);
      this.#observer.observe(this);
    } else {
      window.addEventListener('resize', plan);
    }
    plan();
  }
}

/** Registreert het element. Dubbel registreren is een harde fout in de browser. */
export function registreer(naam = 'mca-sbi-configurator'): void {
  if (!customElements.get(naam)) {
    customElements.define(naam, McaSbiConfigurator);
  }
}
