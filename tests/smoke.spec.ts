import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3456";
const TEST_EMAIL = `smoke-${Date.now()}@test.com`;
const TEST_PASSWORD = "smoke1234";

test.describe("Socratopia Web Smoke Test", () => {
  test("1. Login page loads correctly", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator("h1")).toContainText("先贤之灵");
    await expect(page.locator("input[type=email]")).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
    await expect(page.locator("button[type=submit]")).toContainText("进入图书馆");
  });

  test("2. Full auth flow: register, chat, companions, settings", async ({ page }) => {
    // Register new account
    await page.goto(`${BASE}/login`);
    // Switch to register mode
    await page.getByText("注册").last().click();
    await page.fill("input[type=email]", TEST_EMAIL);
    const pwFields = page.locator("input[type=password]");
    await pwFields.nth(0).fill(TEST_PASSWORD);
    await pwFields.nth(1).fill(TEST_PASSWORD);
    await page.click("button[type=submit]");

    // Wait for redirect to chat
    await page.waitForURL("**/chat", { timeout: 10000 });

    // Chat page elements — check selects (world/mode) are present
    await expect(page.locator("select").first()).toBeVisible();

    // Navigate to companions
    await page.click("a:has-text('先贤')");
    await page.waitForURL("**/companions");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Navigate to settings
    await page.click("a:has-text('设置')");
    await page.waitForURL("**/settings");
    await expect(page.getByText("Anthropic").first()).toBeVisible({ timeout: 5000 });

    // Go back to chat
    await page.click("a:has-text('课堂')");
    await page.waitForURL("**/chat");
  });

  test("3. API routes respond correctly", async ({ request }) => {
    // Auth check (no session = 401 with user: null)
    const meRes = await request.get(`${BASE}/api/auth/me`);
    expect(meRes.status()).toBe(401);
    const meData = await meRes.json();
    expect(meData.user).toBeNull();

    // Login page loads
    const loginRes = await request.get(`${BASE}/login`);
    expect(loginRes.status()).toBe(200);

    // Chat page redirects to login (no session)
    const chatRes = await request.get(`${BASE}/chat`);
    expect(chatRes.status()).toBe(200);
  });
});
