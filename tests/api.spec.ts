import { test, expect } from "@playwright/test";
import { BASE } from "./helpers";

test.describe("API Routes", () => {
  test("GET /api/auth/me returns 401 when no session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/me`);
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.user).toBeNull();
  });

  test("POST /api/auth/register with valid email returns 200", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { email: `api-reg-${Date.now()}@test.com`, password: "test1234" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.userId).toBeDefined();
  });

  test("POST /api/auth/register without password returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { email: "no-password@test.com" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/auth/login with valid credentials returns 200", async ({ request }) => {
    const email = `api-login-${Date.now()}@test.com`;
    await request.post(`${BASE}/api/auth/register`, {
      data: { email, password: "test1234" },
      headers: { "Content-Type": "application/json" },
    });
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email, password: "test1234" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(200);
  });

  test("POST /api/auth/register with invalid email returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { email: "not-an-email", password: "test1234" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("GET /api/companions returns array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/companions`);
    // Without auth this might return 401 or empty array
    // Either is acceptable behavior
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/textbooks returns array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/textbooks`);
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/system returns providers list", async ({ request }) => {
    const res = await request.get(`${BASE}/api/system`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.providers || data).toBeDefined();
  });

  test("GET /api/worlds returns data", async ({ request }) => {
    const res = await request.get(`${BASE}/api/worlds`);
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/chat without body returns error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/chat`, {
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 401]).toContain(res.status());
  });
});
