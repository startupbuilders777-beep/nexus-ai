import { test, expect } from '@playwright/test';

test.describe('NexusAI E2E Tests', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('homepage loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/./);
    expect(consoleErrors).toHaveLength(0);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    // Check for login form or heading
    const hasContent = await page.locator('h1, h2, h3, [role="heading"], form, input').first().isVisible();
    expect(hasContent).toBe(true);
    expect(consoleErrors).toHaveLength(0);
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    // Check for register form or heading
    const hasContent = await page.locator('h1, h2, h3, [role="heading"], form, input').first().isVisible();
    expect(hasContent).toBe(true);
    expect(consoleErrors).toHaveLength(0);
  });

  test('chat page loads', async ({ page }) => {
    await page.goto('/chat');
    // Should redirect to login or show chat interface
    const url = page.url();
    expect(url).toMatch(/(\/chat|\/login)/);
    expect(consoleErrors).toHaveLength(0);
  });

  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or show dashboard
    const url = page.url();
    expect(url).toMatch(/(\/dashboard|\/login)/);
    expect(consoleErrors).toHaveLength(0);
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    // Should redirect to login or show settings
    const url = page.url();
    expect(url).toMatch(/(\/settings|\/login)/);
    expect(consoleErrors).toHaveLength(0);
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation links
    const navLinks = page.locator('nav a, header a, [role="navigation"] a');
    const linkCount = await navLinks.count();
    
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('#')) {
        await page.goto(href);
        await expect(page).not.toHaveTitle(/error|404|500/i);
        expect(consoleErrors).toHaveLength(0);
        await page.goto('/');
      }
    }
  });

  test('API routes return expected responses', async ({ request }) => {
    // Test that API routes exist and return valid responses (even if 401/403 for auth)
    const routes = [
      '/api/agents',
      '/api/data-sources',
      '/api/documents',
      '/api/embeddings',
      '/api/rag',
    ];

    for (const route of routes) {
      const response = await request.get(route);
      // Accept 200, 401, 403 as valid (authenticated routes)
      expect([200, 401, 403]).toContain(response.status());
    }
  });
});
