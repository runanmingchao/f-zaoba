import { test, expect } from "@playwright/test";
import { BASE, login, register } from "./helpers";

test.describe("Auth", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator("h1")).toContainText("先贤之灵");
    await expect(page.locator("input[type=email]")).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
    await expect(page.locator("button[type=submit]")).toContainText("进入图书馆");
  });

  test("register with new email redirects to chat", async ({ page }) => {
    const email = `auth-test-${Date.now()}@test.com`;
    await register(page, email);
    await expect(page.locator("select")).toBeVisible({ timeout: 5000 });
  });

  test("login with registered email works", async ({ page }) => {
    const email = `auth-login-${Date.now()}@test.com`;
    await register(page, email);

    // Logout first
    await page.click("button:has-text('离开')");
    await page.waitForURL("**/login", { timeout: 10000 });

    // Now login with password
    await login(page, email);
    await expect(page.locator("select")).toBeVisible({ timeout: 5000 });
  });

  test("protected routes redirect to login when unauthenticated", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/chat`);
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page.locator("h1")).toContainText("先贤之灵");
    await ctx.close();
  });

  test("invalid credentials shows error", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill("input[type=email]", "no-such-user@test.com");
    await page.fill("input[type=password]", "test1234");
    await page.click("button[type=submit]");
    await expect(page.getByText("账号不存在，请先注册")).toBeVisible({ timeout: 5000 });
  });

  test("wrong password shows error", async ({ page }) => {
    const email = `auth-wrongpw-${Date.now()}@test.com`;
    // Register first
    await register(page, email);

    // Logout
    await page.click("button:has-text('离开')");
    await page.waitForURL("**/login", { timeout: 10000 });

    // Try login with wrong password
    await page.fill("input[type=email]", email);
    await page.fill("input[type=password]", "wrongpassword");
    await page.click("button[type=submit]");
    await expect(page.locator("text=密码错误")).toBeVisible({ timeout: 5000 });
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    const email = `logout-test-${Date.now()}@test.com`;
    await register(page, email);
    await page.click("button:has-text('离开')");
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page.locator("h1")).toContainText("先贤之灵");
  });
});
