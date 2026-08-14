/**
 * Typedeclaraties voor de .mjs-hulpprogramma's.
 *
 * Die blijven bewust plain JavaScript: `capture-golden.mjs` moet met een kale
 * `node`-aanroep te draaien zijn, zonder buildstap. Dit bestand geeft ze wél
 * types zodra ze vanuit TypeScript gebruikt worden.
 */

declare module '*/canonical.mjs' {
  export function canonical(value: unknown): string;
  export function hashSweep<T>(
    iterable: Iterable<T>,
    fn: (input: T) => unknown
  ): { sha256: string; count: number; nonNull: number };
}

declare module '*/sweeps.mjs' {
  import type { ModelSize, RailSpec } from '../../src/domain/types';

  type Rails = Readonly<Record<ModelSize, RailSpec>>;

  export const MODELS: readonly ModelSize[];

  export interface AutoGCase {
    size: ModelSize;
    L: number;
    F: number;
    Gmin: number;
  }

  export interface PartsCase {
    size: ModelSize;
    L: number;
    G1: number;
    G2: number;
    F: number;
    K: number;
    maxL: number;
    minLast: number;
    numParts: number;
  }

  export type AutoNumPartsCase = Omit<PartsCase, 'numParts'>;
  export type SuggestionCase = Omit<PartsCase, 'numParts'> & { count: number };

  export function sweepAutoG(totalLen: number, F: number, Gmin: number): number;
  export function autoGSweep(rails: Rails): Iterable<AutoGCase>;
  export function computePartsSweep(rails: Rails): Iterable<PartsCase>;
  export function autoNumPartsSweep(rails: Rails): Iterable<AutoNumPartsCase>;
  export function boundaryCases(rails: Rails): PartsCase[];
  export function suggestionCases(rails: Rails): SuggestionCase[];
  export function mulberry32(seed: number): () => number;
  export function buildCodeCases(
    count?: number,
    seed?: number
  ): Record<string, string | undefined>[];
  export const STEP_CHOICES: Record<number, readonly string[]>;
}

declare module '*/extract-legacy.mjs' {
  export const REFERENCE_PATH: string;
  export const REFERENCE_SHA256: string;
  export function loadLegacy(): {
    dom: unknown;
    window: Record<string, unknown>;
    RAILS: Record<number, { F: number; Gmin: number; maxL: number; minLast: number }>;
    selections: Record<string, string>;
    TOTAL_STEPS: number;
    buildCode: () => string;
    cpCalcAutoG: (totalLen: number, F: number, Gmin: number) => number;
    cpCalcAutoGDetailed: (totalLen: number, F: number, Gmin: number) => { G: number; n: number };
    cpComputeParts: (...args: number[]) => unknown[] | null;
    cpAutoNumParts: (...args: number[]) => { numParts: number; parts: unknown[] } | null;
    cpFindSuggestions: (...args: number[]) => unknown[];
    step9FindSuggestions: (...args: number[]) => unknown[];
  };
  export function legacyBuildCode(selections: Record<string, string | undefined>): string;
  export function mulberry32(seed: number): () => number;
}
