/**
 * Instappunt van de configurator.
 *
 * Het enige wat hier gebeurt is het registreren van het custom element. Alles
 * daarna zit in de shadow root, zodat de configurator en de pagina eromheen
 * elkaars opmaak niet kunnen raken.
 */
import { registreer } from './element';

registreer();
