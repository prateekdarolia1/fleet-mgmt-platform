import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Clean up DOM after each test
afterEach(() => {
  cleanup();
});

// Silence console.error for React act warnings during tests if needed
vi.spyOn(console, 'error').mockImplementation((...args) => {
  // Allow errors to still show for real failures
  const msg = String(args[0] ?? '');
  if (msg.includes('Not wrapped in act') || msg.includes('validateDOMNesting')) return;
  // @ts-expect-error allow
  console.__errorOriginal?.(...args);
});
// Keep a reference to restore if needed
// @ts-expect-error store original
console.__errorOriginal = console.error;
