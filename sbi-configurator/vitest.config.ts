import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx,mjs}'],
    // Het laden van reference/v1.8.html in jsdom kost ~1 s; de sweeps
    // daaroverheen nog eens een paar seconden.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
