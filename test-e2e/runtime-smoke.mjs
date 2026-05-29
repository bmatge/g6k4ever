import { chromium } from "playwright";

const URL = process.env.URL ?? "http://localhost:5173";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    console.log(`[browser ${msg.type()}]`, msg.text());
  }
});
page.on("pageerror", (err) => console.log(`[page error]`, err.message));

await page.goto(URL, { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(500);

console.log("=== RUNTIME OBSERVATIONS ===");
console.log("Title:", await page.title());

// Take screenshot of initial state
await page.screenshot({ path: "/tmp/runtime-1-initial.png", fullPage: true });
console.log("Screenshot 1 → /tmp/runtime-1-initial.png");

// Verify the selector is there
const selector = page.locator("#sim-selector");
const selectorVisible = await selector.isVisible().catch(() => false);
console.log("Selector visible:", selectorVisible);

if (selectorVisible) {
  const options = await selector.locator("option").allTextContents();
  console.log("Options:", options);

  // Switch to voiture-tco
  await selector.selectOption("voiture-tco");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/runtime-2-voiture.png", fullPage: true });
  console.log("Screenshot 2 (voiture-tco) → /tmp/runtime-2-voiture.png");

  // List all inputs and try to enter values
  const inputs = await page.locator("input, select").all();
  console.log(`\nForm has ${inputs.length} inputs/selects`);
  for (let i = 0; i < Math.min(inputs.length, 15); i++) {
    const input = inputs[i];
    const tag = await input.evaluate((el) => el.tagName.toLowerCase());
    const type = await input.evaluate((el) => el.type ?? "");
    const id = await input.evaluate((el) => el.id ?? "");
    const labeled = await input.evaluate((el) => {
      const lbl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
      return lbl?.textContent?.trim() ?? "";
    });
    const value = await input.evaluate((el) => el.value ?? "");
    console.log(`  [${i}] <${tag} type=${type} id=${id}> "${labeled.slice(0, 60)}" value="${value}"`);
  }

  // Try to find the "Prix d'achat VE" input and enter 30000
  const prixVE = page.getByLabel(/Prix d'achat VE/i).first();
  const prixVEVisible = await prixVE.isVisible().catch(() => false);
  console.log("\nPrix VE input visible:", prixVEVisible);
  if (prixVEVisible) {
    const val = await prixVE.inputValue().catch(() => "?");
    console.log("Prix VE current value:", val);
    await prixVE.fill("40000");
    await page.waitForTimeout(300);
    const newVal = await prixVE.inputValue();
    console.log("Prix VE after fill('40000'):", newVal);
  }

  // Check the KPI / breakdown table for results
  const kpiText = await page.locator(".fr-tile__desc").allTextContents();
  console.log("\nKPI tiles content:", kpiText);

  // Look for breakdown table rows
  const tableRows = await page.locator("table tbody tr").count();
  console.log("Breakdown table rows:", tableRows);
  for (let i = 0; i < Math.min(tableRows, 12); i++) {
    const row = page.locator("table tbody tr").nth(i);
    const txt = (await row.textContent())?.replace(/\s+/g, " ").trim();
    console.log(`  row[${i}]: ${txt}`);
  }

  await page.screenshot({ path: "/tmp/runtime-3-after-edit.png", fullPage: true });
  console.log("\nScreenshot 3 (after edit) → /tmp/runtime-3-after-edit.png");
}

await browser.close();
console.log("\nDone.");
