/**
 * Stabiele serialisatie voor golden-master vergelijking.
 *
 * JSON.stringify volgt de invoegvolgorde van sleutels; die kan bij een herbouw
 * legitiem veranderen zonder dat het gedrag verandert. Daarom sorteren we
 * sleutels, en normaliseren we -0 en floats naar een vaste representatie.
 */
import { createHash } from 'node:crypto';

export function canonical(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const t = typeof value;
  if (t === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    if (Object.is(value, -0)) return '0';
    // 12 significante cijfers: ruim boven de 1e-9 tolerantie van het algoritme,
    // maar onder de ruis van drijvende-komma-representatie.
    return String(Number(value.toPrecision(12)));
  }
  if (t === 'string') return JSON.stringify(value);
  if (t === 'boolean') return String(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (t === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  throw new TypeError(`Niet-serialiseerbaar type: ${t}`);
}

/**
 * Loopt een sweep door en geeft een hash plus tellingen terug.
 *
 * De tellingen zijn er niet voor de sier: als een herbouw per ongeluk overal
 * `null` teruggeeft, klopt de hash niet én zie je meteen dat `nonNull` op 0
 * staat in plaats van te moeten raden wat er misging.
 */
export function hashSweep(iterable, fn) {
  const h = createHash('sha256');
  let count = 0;
  let nonNull = 0;
  for (const input of iterable) {
    const out = fn(input);
    if (out !== null && out !== undefined) nonNull++;
    // Expliciete scheidingstekens: canonical() produceert nooit een newline,
    // dus invoer en uitvoer kunnen niet in elkaar overlopen.
    h.update(canonical(input) + '\n=>\n' + canonical(out) + '\n--\n');
    count++;
  }
  return { sha256: h.digest('hex'), count, nonNull };
}
