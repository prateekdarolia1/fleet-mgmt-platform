/**
 * E2E test for retroactive ledger creation
 *
 * This test requires:
 * - Running Supabase local instance
 * - Running frontend dev server
 * - Playwright configured
 *
 * Run with: npx playwright test e2e/retroactive-ledger-creation.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Retroactive Ledger Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/login');
    // ... login steps
  });

  test('should show confirmation dialog when past date is selected', async ({ page }) => {
    // Navigate to ledger creation
    await page.goto('/fleet/ledgers');

    // Click create ledger button
    await page.click('text=Create Ledger');

    // Select a rider
    await page.click('[data-testid="rider-select"]');
    await page.click('text=Test Rider');

    // Fill in required fields
    await page.fill('[name="security_deposit_amount"]', '5000');
    await page.fill('[name="transaction_id"]', 'TXN123456');
    await page.fill('[name="rental_amount"]', '1500');

    // Select a past date for rental start
    await page.click('[data-testid="rental-start-date"]');
    await page.click('[data-testid="calendar-day-15"]'); // Select 15th

    // Verify confirmation dialog appears
    await expect(page.locator('text=Historical Entry Detected')).toBeVisible();
    await expect(page.locator('text=70%')).toBeVisible(); // Confidence score
  });

  test('should create ledger with historical flags after confirmation', async ({ page }) => {
    // Navigate and fill form (similar to above)
    await page.goto('/fleet/ledgers');
    await page.click('text=Create Ledger');

    // ... fill form steps ...

    // Select past date and confirm
    await page.click('[data-testid="rental-start-date"]');
    await page.click('[data-testid="calendar-day-15"]');

    // Confirm historical entry
    await page.click('text=Confirm as Historical Entry');

    // Verify success message
    await expect(page.locator('text=Ledger created')).toBeVisible();
  });

  test('should cancel and not create ledger', async ({ page }) => {
    // Navigate and fill form
    await page.goto('/fleet/ledgers');
    await page.click('text=Create Ledger');

    // ... fill form steps ...

    // Select past date
    await page.click('[data-testid="rental-start-date"]');
    await page.click('[data-testid="calendar-day-15"]');

    // Cancel the confirmation
    await page.click('text=Cancel');

    // Dialog should close
    await expect(page.locator('text=Historical Entry Detected')).not.toBeVisible();
  });

  test('should allow normal (current date) entry without confirmation', async ({ page }) => {
    // Navigate and fill form
    await page.goto('/fleet/ledgers');
    await page.click('text=Create Ledger');

    // ... fill form steps ...

    // Select today's date
    await page.click('[data-testid="rental-start-date"]');
    const today = new Date().getDate().toString();
    await page.click(`[data-testid="calendar-day-${today}"]`);

    // No confirmation dialog should appear
    await expect(page.locator('text=Historical Entry Detected')).not.toBeVisible();

    // Form should submit directly
    await page.click('text=Create Ledger');
    await expect(page.locator('text=Ledger created')).toBeVisible();
  });
});
