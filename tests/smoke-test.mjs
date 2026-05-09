import { chromium } from "playwright-core";

const BASE = "http://localhost:3456";
const TEST_EMAIL = `smoke-${Date.now()}@test.com`;

const results = [];
function log(test, ok, detail) {
  const status = ok ? "✅" : "❌";
  results.push({ test, ok, detail });
  console.log(`${status} ${test}${detail ? ": " + detail : ""}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Socratopia Web Phase 3 Smoke Test (Edge)");
  console.log("=".repeat(60) + "\n");

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Auth
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    log("Login renders", (await page.textContent("h1"))?.includes("先贤之灵"));

    await page.fill("input[type=email]", TEST_EMAIL);
    await page.click("button[type=submit]");
    await page.waitForURL("**/chat", { timeout: 15000 });
    log("Register + redirect /chat", page.url().endsWith("/chat"));

    // Sidebar nav
    const sidebar = await page.textContent("aside");
    log("Sidebar has 世界", sidebar?.includes("世界"));
    log("Sidebar has 对话", sidebar?.includes("对话"));

    // Navigate to world page
    await page.click("a:has-text('世界')");
    await page.waitForURL("**/world", { timeout: 5000 });
    log("Navigate /world", page.url().endsWith("/world"));

    // World editor has textarea
    await page.waitForSelector("textarea", { timeout: 5000 });
    log("World textarea visible", true);

    // Navigate to conversations
    await page.click("a:has-text('对话')");
    await page.waitForURL("**/conversations", { timeout: 5000 });
    log("Navigate /conversations", page.url().endsWith("/conversations"));

    // Navigate to companions
    await page.click("a:has-text('先贤')");
    await page.waitForURL("**/companions", { timeout: 5000 });
    log("Navigate /companions", page.url().endsWith("/companions"));

    // Create new companion
    await page.click("button:has-text('创建同伴')");
    await page.waitForURL("**/companions/new", { timeout: 5000 });
    log("Navigate /companions/new", page.url().includes("/companions/new"));

    await page.fill("input", "测试同伴");
    await page.fill("textarea", "# 测试\n这是一个测试同伴。");
    await page.click("button:has-text('保存')");
    await page.waitForTimeout(2000);
    log("Companion created", !page.url().includes("/new"));

    // API tests
    const worldsRes = await page.evaluate(async () => {
      const r = await fetch("/api/worlds");
      return r.json();
    });
    log("GET /api/worlds", Array.isArray(worldsRes) && worldsRes.length > 0, `count=${worldsRes.length}`);

    const convsRes = await page.evaluate(async () => {
      const r = await fetch("/api/conversations");
      return r.json();
    });
    log("GET /api/conversations", Array.isArray(convsRes), `count=${convsRes.length}`);

    // Navigate to settings
    await page.click("a:has-text('设置')");
    await page.waitForURL("**/settings", { timeout: 5000 });
    log("Navigate /settings", page.url().endsWith("/settings"));

    // Phase 3: Library
    await page.click("a:has-text('教材')");
    await page.waitForURL("**/library", { timeout: 5000 });
    log("Navigate /library", page.url().endsWith("/library"));

    // Create textbook
    await page.click("button:has-text('添加教材')");
    await page.waitForTimeout(500);
    await page.fill("input[placeholder='教材名称']", "测试教材");
    await page.fill("textarea[placeholder*='教材内容']", "# 第一章\n测试内容");
    await page.click("button:has-text('保存')");
    await page.waitForTimeout(1000);
    const tbVisible = await page.textContent("body");
    log("Textbook created", tbVisible?.includes("测试教材"));

    // Textbook reader
    await page.click("text=测试教材");
    await page.waitForTimeout(1000);
    log("Navigate /library/[id]", page.url().includes("/library/") && !page.url().endsWith("/library"));

    // Go back
    await page.click("button:has-text('返回')");
    await page.waitForTimeout(500);

    // Diary
    await page.click("a:has-text('日记')");
    await page.waitForURL("**/tools/diary", { timeout: 5000 });
    log("Navigate /tools/diary", page.url().endsWith("/tools/diary"));

    // Create diary entry
    await page.click("button:has-text('写日记')");
    await page.waitForTimeout(500);
    const diaryTextarea = await page.isVisible("textarea[placeholder*='今天']");
    log("Diary textarea visible", diaryTextarea);

    // Group chat
    await page.click("a:has-text('群聊')");
    await page.waitForURL("**/tools/groupchat", { timeout: 5000 });
    log("Navigate /tools/groupchat", page.url().endsWith("/tools/groupchat"));

  } catch (err) {
    console.error("\n❌ Error:", err.message);
  } finally {
    await browser.close();
  }

  console.log("\n" + "=".repeat(60));
  const passed = results.filter(r => r.ok).length;
  const total = results.length;
  console.log(`${passed === total ? "🎉" : "⚠️"} ${passed}/${total} passed`);
  results.forEach(r => console.log(`  ${r.ok ? "✅" : "❌"} ${r.test}`));
  console.log("=".repeat(60));
  process.exit(passed === total ? 0 : 1);
}

main();
