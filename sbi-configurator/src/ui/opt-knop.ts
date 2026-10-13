/**
 * Lezen van de optieknoppen uit de v1.8-markup.
 *
 * Bewust via de zichtbare `.opt-code` en niet via het `onclick`-attribuut:
 * fase 2c haalt die attributen weg.
 */

/** De standaardknoppen tonen `—` als code; in de bestelcode is dat leeg. */
export function codeVan(knop: Element): string {
  const tekst = knop.querySelector('.opt-code')?.textContent?.trim() ?? '';
  return tekst === '—' ? '' : tekst;
}

export function knoppenVan(root: ParentNode, stap: number): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>(`#step${stap} .option-grid .opt-btn`));
}
