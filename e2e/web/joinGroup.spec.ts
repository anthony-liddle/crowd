import { test, expect } from '@playwright/test';

test.describe('Join Group E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should create a crowd', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Navigate to crowds screen (adjust selector based on actual UI)
    const crowdsButton = page.getByRole('button', { name: /crowds/i });
    if (await crowdsButton.isVisible()) {
      await crowdsButton.click();
    }

    // Click create crowd button
    const createButton = page.getByRole('button', { name: /create/i });
    await createButton.click();

    // Fill in crowd name
    const nameInput = page.getByPlaceholder(/crowd name/i);
    await nameInput.fill('Test Crowd E2E');

    // Submit form
    const submitButton = page.getByRole('button', { name: /create|submit/i });
    await submitButton.click();

    // Verify crowd was created (adjust based on actual UI)
    await expect(page.getByText('Test Crowd E2E')).toBeVisible();
  });

  test('should join a crowd via invite link', async ({ page }) => {
    // This test would require:
    // 1. A crowd to exist (created via API or previous test)
    // 2. An invite link mechanism
    // 3. Navigation to the invite link
    // 4. Verification of membership

    // Placeholder for actual implementation
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Example: Navigate to join modal
    const joinButton = page.getByRole('button', { name: /join/i });
    if (await joinButton.isVisible()) {
      await joinButton.click();

      // Enter crowd ID or invite code
      const input = page.getByPlaceholder(/crowd id|invite code/i);
      if (await input.isVisible()) {
        await input.fill('test-crowd-id');
        await page.getByRole('button', { name: /join|submit/i }).click();
      }
    }
  });

  test('should post and boost messages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to create message (adjust selector)
    const createMessageButton = page.getByRole('button', { name: /create|post|message/i });
    if (await createMessageButton.isVisible()) {
      await createMessageButton.click();

      // Fill message form
      const textInput = page.getByPlaceholder(/message|text/i);
      await textInput.fill('E2E Test Message');

      // Set radius and duration if needed
      const radiusInput = page.getByLabel(/radius/i);
      if (await radiusInput.isVisible()) {
        await radiusInput.fill('1000');
      }

      // Submit message
      const submitButton = page.getByRole('button', { name: /post|submit|create/i });
      await submitButton.click();

      // Verify message appears in feed
      await expect(page.getByText('E2E Test Message')).toBeVisible();
    }

    // Boost a message
    const boostButton = page.getByRole('button', { name: /boost/i }).first();
    if (await boostButton.isVisible()) {
      await boostButton.click();
      // Verify boost count increased or button state changed
    }
  });

  test('should filter and sort feed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test feed source selector
    const feedSelector = page.getByRole('combobox', { name: /feed|source/i });
    if (await feedSelector.isVisible()) {
      await feedSelector.selectOption({ label: /crowd/i });
    }

    // Test sort options
    const sortNearest = page.getByRole('button', { name: /nearest/i });
    if (await sortNearest.isVisible()) {
      await sortNearest.click();
    }

    const sortSoonest = page.getByRole('button', { name: /soonest|expiring/i });
    if (await sortSoonest.isVisible()) {
      await sortSoonest.click();
    }
  });
});
