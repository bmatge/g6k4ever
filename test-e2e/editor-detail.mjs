import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log(`[${msg.type()}]`, msg.text().slice(0, 200));
});
page.on("pageerror", (err) => console.log(`[PAGE ERROR]`, err.message));

await page.goto("http://localhost:5174", { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(500);

await page.locator("#user-id").fill("alice");
await page.getByRole("button", { name: /Continuer/i }).click();
await page.waitForTimeout(1500);

await page.getByText(/TCO Voiture/i).first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/editor-loaded.png", fullPage: true });

console.log("=== Lock status check ===");
const lockBadge = await page.locator(".fr-badge").allTextContents();
console.log("Badges visible:", lockBadge);

console.log("\n=== Preview pane (right) ===");
const previewBlock = page.locator(".g6k-simulator-api");
const previewVisible = await previewBlock.isVisible().catch(() => false);
console.log("Preview area visible:", previewVisible);
if (previewVisible) {
  const previewHTML = await previewBlock.evaluate((el) => el.innerHTML.length);
  console.log("Preview HTML length:", previewHTML);

  const inputs = await previewBlock.locator("input, select").elementHandles();
  console.log(`Preview has ${inputs.length} inputs/selects`);
  for (let i = 0; i < Math.min(inputs.length, 12); i++) {
    const props = await inputs[i].evaluate((el) => ({
      type: el.type,
      id: el.id,
      value: el.value,
      visible: el.offsetParent !== null,
    }));
    const label = await inputs[i].evaluate((el) => {
      const lbl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
      return lbl?.textContent?.trim()?.slice(0, 50) ?? "";
    });
    console.log(`  [${i}] type=${props.type} id=${props.id} visible=${props.visible} value="${props.value}" label="${label}"`);
  }

  // Try to fill prix VE in the PREVIEW
  console.log("\n=== Trying to interact with preview ===");
  const previewPrixVE = previewBlock.getByLabel(/Prix d'achat VE/i).first();
  const visible = await previewPrixVE.isVisible().catch(() => false);
  console.log("Preview Prix VE visible:", visible);
  if (visible) {
    const before = await previewPrixVE.inputValue();
    console.log("  → before:", before);
    await previewPrixVE.fill("50000");
    await page.waitForTimeout(800); // attendre debounce 300ms + API
    const after = await previewPrixVE.inputValue();
    console.log("  → after fill('50000'):", after);

    // Check KPI updated
    const kpis = await previewBlock.locator(".fr-tile__desc").allTextContents();
    console.log("KPI values after edit:", kpis);
  }
}

console.log("\n=== Form (left) — onglet Données ===");
// Click Données tab (exact match)
await page.getByRole("tab", { name: "Données", exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/editor-data-tab.png", fullPage: true });

const dataRows = await page.locator(".fr-tabs__panel--selected table tbody tr").count();
console.log("Data table rows:", dataRows);

// Tester saisie d'un label de Data
const labelInput = page.locator(".fr-tabs__panel--selected table tbody tr").first().locator("input").nth(1);
const labelInputVisible = await labelInput.isVisible().catch(() => false);
console.log("First Data label input visible:", labelInputVisible);
if (labelInputVisible) {
  const lockReleased = lockBadge.some(b => b.includes("Verrou acquis"));
  console.log("Verrou acquis ?", lockReleased);
  const before = await labelInput.inputValue();
  console.log("  → before:", before);
  await labelInput.fill("Distance annuelle (km)");
  const after = await labelInput.inputValue();
  console.log("  → after fill:", after);
}

await browser.close();
console.log("\nDone.");
