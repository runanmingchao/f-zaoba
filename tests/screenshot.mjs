import { chromium } from "playwright-core";

const BASE = "http://localhost:3456";
const TEST_EMAIL = `view-${Date.now()}@test.com`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

// Login / Register
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("input[type=email]", TEST_EMAIL);
await page.click("button[type=submit]");
await page.waitForURL("**/chat", { timeout: 15000 });
await page.screenshot({ path: "tests/screenshots/01-chat.png", fullPage: false });
console.log("✓ Chat page");

// World
await page.click("a:has-text('世界')");
await page.waitForURL("**/world", { timeout: 5000 });
await page.waitForSelector("textarea", { timeout: 5000 });
await page.fill("textarea", "# 苏格拉底的花园\n\n在这片花园中，思想的种子在对话的浇灌下生长。");
await page.click("button:has-text('保存')");
await page.waitForTimeout(500);
await page.screenshot({ path: "tests/screenshots/02-world.png", fullPage: false });
console.log("✓ World page");

// Library
await page.click("a:has-text('教材')");
await page.waitForURL("**/library", { timeout: 5000 });
await page.click("button:has-text('添加教材')");
await page.waitForTimeout(300);
await page.fill("input[placeholder='教材名称']", "理想国·卷一");
await page.fill("textarea[placeholder*='教材内容']", "# 第一章 开场\n\n苏格拉底下到比雷埃夫斯港，参加了女神的祭典…\n\n# 第二章 与克法洛斯的对话\n\n他们来到了克法洛斯的家。老人坐在门廊下…");
await page.click("button:has-text('保存')");
await page.waitForTimeout(800);
await page.screenshot({ path: "tests/screenshots/03-library.png", fullPage: false });
console.log("✓ Library page");

// Textbook reader
await page.click("text=理想国·卷一");
await page.waitForTimeout(1000);
await page.screenshot({ path: "tests/screenshots/04-reader.png", fullPage: false });
console.log("✓ Textbook reader");

// Diary
await page.click("a:has-text('日记')");
await page.waitForURL("**/tools/diary", { timeout: 5000 });
await page.click("button:has-text('写日记')");
await page.waitForTimeout(300);
await page.fill("textarea[placeholder*='今天']", "# 今日学习笔记\n\n今天与苏格拉底讨论了**正义**的本质。\n\n> 正义不是强者的利益，而是灵魂的和谐。\n\n这个观点让我重新思考了之前对正义的理解。");
await page.click("button:has-text('保存')");
await page.waitForTimeout(800);
await page.screenshot({ path: "tests/screenshots/05-diary.png", fullPage: false });
console.log("✓ Diary page");

// Conversations
await page.click("a:has-text('对话')");
await page.waitForURL("**/conversations", { timeout: 5000 });
await page.screenshot({ path: "tests/screenshots/06-conversations.png", fullPage: false });
console.log("✓ Conversations page");

// Companions
await page.click("a:has-text('先贤')");
await page.waitForURL("**/companions", { timeout: 5000 });
await page.screenshot({ path: "tests/screenshots/07-companions.png", fullPage: false });
console.log("✓ Companions page");

// Group chat
await page.click("a:has-text('群聊')");
await page.waitForURL("**/tools/groupchat", { timeout: 5000 });
await page.screenshot({ path: "tests/screenshots/08-groupchat.png", fullPage: false });
console.log("✓ Group chat page");

await browser.close();
console.log("\nDone! All screenshots saved to tests/screenshots/");
