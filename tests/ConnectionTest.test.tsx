import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { ConnectionTest } from '@/components/debug/ConnectionTest';

// Mock supabase client
let fromMock: any;
vi.mock('@/integrations/supabase/client', () => {
  fromMock = vi.fn();
  return {
    supabase: {
      from: (...args: any[]) => fromMock(...args),
    },
  };
});

// Silence toasts in tests
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('ConnectionTest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock fetch behavior: jsonplaceholder OK, supabase domain fails
    global.fetch = vi.fn(async (url: any) => {
      const href = String(url);
      if (href.includes('jsonplaceholder.typicode.com')) {
        return {
          ok: true,
          json: async () => ({ id: 1 }),
        } as any;
      }
      if (href.includes('supabase.co')) {
        // Simulate DNS/network failure
        throw new TypeError('Failed to fetch');
      }
      return { ok: true } as any;
    }) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows failure when Supabase domain and DB calls fail', async () => {
    // supabase.from('vehicles').select(...)
    const selectMock = vi
      .fn()
      .mockResolvedValue({ error: new Error('TypeError: Failed to fetch'), count: null });
    fromMock.mockReturnValue({ select: selectMock });

    render(<ConnectionTest />);

    fireEvent.click(screen.getByRole('button', { name: /test db/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Generic:OK \| Supabase Domain:FAIL \| DB: ERROR - TypeError: Failed to fetch/i)
      ).toBeInTheDocument();
    });
  });

  it('shows success when DB responds with a count', async () => {
    // Make supabase return a successful count
    const selectMock = vi.fn().mockResolvedValue({ error: null, count: 10 });
    fromMock.mockReturnValue({ select: selectMock });

    // For this test, also make supabase domain fetch succeed
    (global.fetch as any).mockImplementation(async (url: any) => {
      const href = String(url);
      if (href.includes('jsonplaceholder.typicode.com')) {
        return { ok: true, json: async () => ({ id: 1 }) } as any;
      }
      if (href.includes('supabase.co')) {
        return { ok: true } as any;
      }
      return { ok: true } as any;
    });

    render(<ConnectionTest />);

    fireEvent.click(screen.getByRole('button', { name: /test db/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Generic:OK \| Supabase Domain:OK \| DB: OK - 10 rows/i)
      ).toBeInTheDocument();
    });
  });
});
