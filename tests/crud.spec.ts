import { test, expect } from "@playwright/test";
import { BASE, registerNewUser, createTextbook } from "./helpers";

test.describe("CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUser(page);
  });

  test("create and delete a textbook", async ({ page }) => {
    const title = `测试教材-${Date.now()}`;
    await createTextbook(page, title, "# 第一章\n\n这是测试内容。");
    // Delete it
    page.on("dialog", d => d.accept());
    await page.click("button:has-text('删除')");
    await expect(page.getByText(title)).not.toBeVisible({ timeout: 5000 });
  });

  test("create a companion", async ({ page }) => {
    await page.goto(`${BASE}/companions`);
    await page.click("button:has-text('创建同伴')");
    await page.waitForURL("**/companions/new");
    await page.fill("input[placeholder='给你的同伴取个名字']", "测试同伴");
    await page.fill("textarea[placeholder*='性格']", "你是一个测试同伴。");
    await page.click("button:has-text('保存')");
    await page.waitForURL("**/companions/**", { timeout: 10000 });
    await expect(page.locator("input").first()).toHaveValue("测试同伴");
  });

  test("create a diary entry", async ({ page }) => {
    await page.goto(`${BASE}/tools/diary`);
    await page.click("button:has-text('写日记')");
    const content = `测试日记-${Date.now()}`;
    await page.fill("textarea[placeholder*='今天学到了什么']", content);
    await page.click("button:has-text('保存')");
    await expect(page.getByText(content)).toBeVisible({ timeout: 5000 });
  });

  test("save world narrative", async ({ page }) => {
    await page.goto(`${BASE}/world`);
    // If empty world, create one
    const newWorldBtn = page.locator("button:has-text('新建世界')");
    if (await newWorldBtn.isVisible().catch(() => false)) {
      await newWorldBtn.click();
      await page.fill("input[placeholder='给这个世界起个名字']", "测试世界");
      await page.fill("textarea", "这是一个测试世界的叙事。");
      await page.click("button:has-text('保存')");
      await expect(page.getByText("测试世界")).toBeVisible({ timeout: 5000 });
    } else {
      // Already has world, save it
      await page.fill("textarea", "更新的叙事内容");
      await page.click("button:has-text('保存')");
    }
  });

  test("add exercise to textbook", async ({ page }) => {
    const title = `习题测试-${Date.now()}`;
    await createTextbook(page, title, "# 第一章\n\n教材内容。");
    await page.click(`text=${title}`);
    await page.waitForURL("**/library/**");
    await page.click("button:has-text('习题库')");
    await page.click("button:has-text('添加习题')");
    await page.fill("textarea[placeholder='题目']", "这是一道测试题？");
    await page.fill("textarea[placeholder='参考答案（可选）']", "这是答案。");
    await page.click("button:has-text('添加')");
    await expect(page.getByText("这是一道测试题？")).toBeVisible({ timeout: 5000 });
  });
});
