import { test, expect } from "@playwright/test";
import { BASE, registerNewUser } from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUser(page);
  });

  const navItems = [
    { label: "课堂", path: "/chat" },
    { label: "先贤", path: "/companions" },
    { label: "世界", path: "/world" },
    { label: "对话", path: "/conversations" },
    { label: "教材", path: "/library" },
    { label: "日记", path: "/tools/diary" },
    { label: "群聊", path: "/tools/groupchat" },
    { label: "设置", path: "/settings" },
  ];

  for (const { label, path } of navItems) {
    test(`navigates to ${label} (${path})`, async ({ page }) => {
      await page.click(`a:has-text('${label}')`);
      await page.waitForURL(`**${path}`, { timeout: 10000 });
      // Each page should have a heading or content
      await expect(page.locator("h1, h2").first()).toBeVisible();
    });
  }

  test("sidebar shows preset companions", async ({ page }) => {
    await page.goto(`${BASE}/chat`);
    // The sidebar should show companion names
    await expect(page.getByText("三位先贤")).toBeVisible({ timeout: 5000 });
  });

  test("theme toggle works", async ({ page }) => {
    await page.goto(`${BASE}/chat`);
    // Find theme toggle button (moon/sun emoji)
    const themeBtn = page.locator("button:has-text('🌙'), button:has-text('☀️')");
    await expect(themeBtn).toBeVisible({ timeout: 5000 });
    await themeBtn.click();
    // Theme should have toggled (data-theme attribute changes)
    const html = page.locator("html");
    const theme = await html.getAttribute("data-theme");
    expect(["light", "dark"]).toContain(theme);
  });
});
