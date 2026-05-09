import { Page, expect } from "@playwright/test";

export const BASE = "http://localhost:3456";
const TEST_PASSWORD = "test1234";

export async function login(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto(`${BASE}/login`);
  // If submit button says "注册新账号", we're in register mode — switch to login
  const submitBtn = page.locator("button[type=submit]");
  const submitText = await submitBtn.textContent();
  if (submitText?.includes("注册")) {
    await page.getByRole("button", { name: "登录" }).click();
  }
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/chat", { timeout: 10000 });
}

export async function register(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto(`${BASE}/login`);
  // If submit button says "进入图书馆", we're in login mode — switch to register
  const submitBtn = page.locator("button[type=submit]");
  const submitText = await submitBtn.textContent();
  if (submitText?.includes("图书馆")) {
    await page.getByRole("button", { name: "注册" }).click();
  }
  await page.fill("input[type=email]", email);
  const pwFields = page.locator("input[type=password]");
  await pwFields.nth(0).fill(password);
  await pwFields.nth(1).fill(password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/chat", { timeout: 10000 });
}

export async function registerNewUser(page: Page) {
  const email = `e2e-${Date.now()}@test.com`;
  await register(page, email);
  return email;
}

export async function createTextbook(page: Page, title: string, content: string) {
  await page.goto(`${BASE}/library`);
  await page.click("button:has-text('添加教材')");
  await page.fill("input[placeholder='教材名称']", title);
  await page.fill("textarea[placeholder*='粘贴教材内容']", content);
  await page.click("button:has-text('保存')");
  await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
}

export async function navigateTo(page: Page, label: string) {
  await page.click(`a:has-text('${label}')`);
}
