import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("an administrator can sign in", async ({ page }) => {
  await signIn(page, "admin@example.com");
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
});

test("staff cannot open user management", async ({ page }) => {
  await signIn(page, "staff@example.com");
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toHaveCount(0);
});

test("staff can register a client and record a purchase", async ({ page }) => {
  const name = `Playwright Client ${Date.now()}`;
  await signIn(page, "staff@example.com");
  await page.getByRole("link", { name: "Clients" }).click();
  await page.getByRole("button", { name: "Add client" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(name)).toBeVisible();
  await page.getByRole("link", { name: "Transactions" }).click();
  await page.getByRole("button", { name: "Record transaction" }).click();
  await page.locator("select[name=clientId]").selectOption({ label: name });
  await page.locator("select[name=productId]").selectOption({ index: 1 });
  await page.locator("input[name=quantity]").fill("1.5");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("cell", { name })).toBeVisible();
});
