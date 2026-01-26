import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.properties.ts',
        '**/*.properties.tsx',
        '**/*.d.ts',
        '.next/',
        'dist/',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/**/*.properties.ts', 'tests/**/*.properties.tsx'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
});
