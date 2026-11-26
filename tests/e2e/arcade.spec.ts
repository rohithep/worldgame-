import { test, expect } from "@playwright/test";

test.describe("Public browsing & navigation", () => {
  test("landing page renders hero and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Play\. Score\. Rank\. Worldwide\./i })).toBeVisible();
    await expect(page.getByRole("link", { name: "New Player" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Returning Player" }).first()).toBeVisible();
  });

  test("games grid lists all 9 games", async ({ page }) => {
    await page.goto("/games");
    for (const name of [
      "Higher or Lower",
      "Flag Streak",
      "Typing Sprint",
      "Math Dash",
      "Word Scramble",
      "Blind Stopwatch",
      "Blurry Reveal",
      "Guess the Number",
      "Color Whisperer",
    ]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
  });

  test("privacy page explains data collection and deletion", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Notice" })).toBeVisible();
    await expect(page.getByText(/What we collect/i)).toBeVisible();
  });
});

// Full authenticated flow requires a live Supabase instance configured in .env.local
test.describe("Full Auth, Gameplay & Lockout E2E", () => {
  test.skip(
    process.env.E2E_WITH_SUPABASE !== "1",
    "Set E2E_WITH_SUPABASE=1 with a configured Supabase project to run live auth & gameplay E2E."
  );

  test("register, save login card, logout, login, play Blind Stopwatch, and hit 5-PIN lockout", async ({
    page,
  }) => {
    const username = `E2E_Player_${Date.now().toString().slice(-6)}`;
    const pin = "482917";

    // 1. Register
    await page.goto("/join?mode=new");
    await page.fill("#reg-name", "Test Player");
    await page.getByRole("button", { name: "Next" }).click();

    await page.selectOption("#reg-birth-year", "1998");
    await page.getByRole("button", { name: "Next" }).click();

    await page.click("#country-select");
    await page.getByRole("option", { name: "India" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await page.fill("#reg-username", username);
    await expect(page.getByText("Username is available!")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Next" }).click();

    await page.fill("#reg-pin", pin);
    await page.fill("#reg-pin-confirm", pin);
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: "Create account" }).click();

    // 2. Save-your-login screen
    await expect(page.getByText(/Screenshot this now/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("saved-username")).toHaveText(username);
    await expect(page.getByTestId("saved-pin")).toHaveText(pin);
    await page.getByLabel(/I saved my username/i).check();
    await page.getByRole("button", { name: /Continue to the Arcade/i }).click();
    await expect(page).toHaveURL(/\/games/);

    // 3. Logout from /me
    await page.goto("/me");
    await page.getByRole("button", { name: /Sign Out/i }).click();

    // 4. Returning Player login
    await page.goto("/join?mode=returning");
    await page.fill("#login-username", username);
    await page.fill("#login-pin", pin);
    await page.getByRole("button", { name: /Enter the Arcade/i }).click();
    await expect(page).toHaveURL(/\/games/);

    // 5. Play Blind Stopwatch
    await page.goto("/games/blind-stopwatch");
    await page.getByRole("button", { name: /Play Now/i }).click();
    await page.getByRole("button", { name: /STOP AT 10\.000s/i }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(2300);
    await page.getByRole("button", { name: /STOP AT 10\.000s/i }).click();
    await expect(page.getByTestId("game-result-score")).toBeVisible();

    // 6. Verify on leaderboard
    await page.goto("/leaderboard/blind-stopwatch");
    await expect(page.getByText(username).first()).toBeVisible({ timeout: 8000 });

    // 7. Sign out and trigger 5-attempt lockout
    await page.goto("/me");
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await page.goto("/join?mode=returning");

    for (let i = 0; i < 6; i++) {
      await page.fill("#login-username", username);
      await page.fill("#login-pin", "904731");
      await page.getByRole("button", { name: /Enter the Arcade/i }).click();
      await page.waitForTimeout(350);
    }
    await expect(page.getByRole("alert")).toContainText(/Too many failed PIN attempts/i);
  });
});
