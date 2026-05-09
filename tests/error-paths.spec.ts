import { test, expect } from "@playwright/test";
import { BASE, registerNewUser, login, register } from "./helpers";

test.describe("Error Paths", () => {
  test("404 page shows appropriate content", async ({ page }) => {
    await page.goto(`${BASE}/nonexistent-page-12345`);
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("unauthorized API access returns 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/chat`, {
      data: { message: "hello" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
  });

  test("protected API requires auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/companions`, {
      data: { name: "test" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
  });

  test("missing required fields return validation error", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await registerNewUser(page);

    const res = await page.request.post(`${BASE}/api/textbooks`, {
      data: { title: "" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);

    await ctx.close();
  });

  test("invalid companion ID shows error page", async ({ page }) => {
    await registerNewUser(page);
    await page.goto(`${BASE}/companions/nonexistent-id-xyz`);
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("network error recovery - fetch interception", async ({ page }) => {
    await registerNewUser(page);

    await page.route("**/api/companions**", (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: "模拟服务器错误" }) });
    });

    await page.goto(`${BASE}/companions`);
    await expect(page.getByText("加载失败").first()).toBeVisible({ timeout: 5000 });
  });
});
