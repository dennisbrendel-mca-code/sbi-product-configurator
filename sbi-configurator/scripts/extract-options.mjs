#!/usr/bin/env node
/**
 * Haalt de volledige stap- en optiestructuur uit reference/v1.8.html.
 *
 * De opties staan in v1.8 verspreid over drie plekken die uit de pas kunnen
 * lopen: het argument van `onclick="select(...)"`, de `.opt-code` en de
 * `.opt-label`. Dit script leest ze alledrie uit en schrijft ze weg als
 * `test/golden/ui-options.json`.
 *
 * Die JSON hoort bij de golden master: de handgeschreven datalaag in
 * `src/domain/catalog.fields.ts` wordt ertegen getoetst. Zo is uitgesloten dat
 * er bij het omzetten naar data een optie, code of beperking wegvalt.
 *
 *   node scripts/extract-options.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// Zonder scripts: we willen de markup zoals hij op schijf staat, vóór enige
// voorselectie of filtering door de UI-code.
const dom = new JSDOM(readFileSync(resolve(ROOT, 'reference/v1.8.html'), 'utf8'));
const doc = dom.window.document;

const tekst = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const stappen = [];
for (const card of doc.querySelectorAll('.step-card')) {
  const id = card.id; // step1 … step15, step12b
  const titel = tekst(card.querySelector('.step-title'));
  const omschrijving = tekst(card.querySelector('.step-desc'));

  const opties = [];
  for (const btn of card.querySelectorAll('.opt-btn')) {
    const onclick = btn.getAttribute('onclick') ?? '';
    // select(2,'FL','Flens uitvoering',this)  →  code FL, label 'Flens uitvoering'
    const m = onclick.match(/^select\(\s*(\d+)\s*,\s*'([^']*)'\s*,\s*'([^']*)'/);
    opties.push({
      code: m ? m[2] : null,
      labelInAanroep: m ? m[3] : null,
      optCode: tekst(btn.querySelector('.opt-code')) || null,
      optLabel: tekst(btn.querySelector('.opt-label')) || null,
      models: btn.dataset.models ? btn.dataset.models.split(',').map((s) => +s.trim()) : null,
      bijzonder: m ? null : onclick.replace(/\(.*$/, ''), // bv. selectNoCarriage
    });
  }

  const invoer = [];
  for (const input of card.querySelectorAll('input[type="number"]')) {
    invoer.push({
      id: input.id,
      min: input.getAttribute('min'),
      max: input.getAttribute('max'),
      step: input.getAttribute('step'),
      value: input.getAttribute('value'),
      placeholder: input.getAttribute('placeholder'),
    });
  }

  stappen.push({ id, titel, omschrijving, opties, invoer });
}

// De voorselecties: welke optie-index krijgt welke stap bij de eerste interactie.
const script = readFileSync(resolve(ROOT, 'reference/v1.8.html'), 'utf8');
const defBlok = script.match(/const defaults = \[([\s\S]*?)\];/);
const defaults = defBlok
  ? [...defBlok[1].matchAll(/\{\s*step:\s*(\d+),\s*idx:\s*(\d+)\s*\}/g)].map((m) => ({
      step: +m[1],
      idx: +m[2],
    }))
  : [];

const uit = { stappen, defaults };
writeFileSync(resolve(ROOT, 'test/golden/ui-options.json'), JSON.stringify(uit, null, 2) + '\n');

const totaalOpties = stappen.reduce((a, s) => a + s.opties.length, 0);
console.log(`Uitgelezen: ${stappen.length} stapkaarten, ${totaalOpties} opties, ${defaults.length} voorselecties.`);
for (const s of stappen) {
  if (s.opties.length || s.invoer.length) {
    console.log(
      `  ${s.id.padEnd(8)} ${s.titel.slice(0, 32).padEnd(34)} ` +
        `${String(s.opties.length).padStart(2)} opties  ${s.invoer.length} invoervelden`
    );
  }
}
