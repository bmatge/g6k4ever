import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    console.log(`[${msg.type()}]`, msg.text().slice(0, 200));
  }
});
page.on("pageerror", (err) => console.log(`[PAGE ERROR]`, err.message));

await page.goto("http://localhost:5174", { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/editor-1-prompt.png", fullPage: true });

// User-id prompt
const userInput = page.locator("#user-id");
const userInputVisible = await userInput.isVisible().catch(() => false);
console.log("User-id prompt visible:", userInputVisible);
if (userInputVisible) {
  await userInput.fill("alice");
  await page.getByRole("button", { name: /Continuer/i }).click();
  await page.waitForTimeout(1500);
}

await page.screenshot({ path: "/tmp/editor-2-list.png", fullPage: true });

// Liste des simulateurs
const cards = page.locator(".fr-card__title");
const cardCount = await cards.count();
console.log("Simulator cards visible:", cardCount);
const titles = await cards.allTextContents();
console.log("Titles:", titles);

// Cliquer sur voiture-tco
const voitureLink = page.getByText(/TCO Voiture/i).first();
const voitureVisible = await voitureLink.isVisible().catch(() => false);
console.log("'TCO Voiture' link visible:", voitureVisible);
if (voitureVisible) {
  await voitureLink.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/editor-3-voiture.png", fullPage: true });

  // Onglets visibles ?
  const tabs = await page.locator(".fr-tabs__tab").allTextContents();
  console.log("Tabs:", tabs);

  // Preview pane à droite — combien d'inputs ?
  const previewInputs = await page.locator(".fr-container--fluid input").count();
  console.log("Total inputs in editor (form + preview):", previewInputs);

  // Form metadata
  const metaName = page.locator("#meta-name");
  const metaNameVisible = await metaName.isVisible().catch(() => false);
  console.log("Metadata 'Slug' input visible:", metaNameVisible);
  if (metaNameVisible) {
    console.log("  → value:", await metaName.inputValue());
  }

  // Tester le clic sur l'onglet "Données"
  console.log("\n=== Clicking Données tab ===");
  await page.getByRole("tab", { name: "Données" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/editor-4-donnees.png", fullPage: true });

  const dataInputs = await page.locator(".fr-table input").count();
  console.log("Data table inputs:", dataInputs);

  // Try to fill one Data label
  const firstLabelInput = page.locator(".fr-table tbody tr").nth(2).locator("input").nth(1);
  const firstLabelExists = await firstLabelInput.isVisible().catch(() => false);
  console.log("First Data label input visible:", firstLabelExists);
  if (firstLabelExists) {
    const curVal = await firstLabelInput.inputValue();
    console.log("  → current value:", curVal);
    await firstLabelInput.fill("Prix VE modifié");
    const newVal = await firstLabelInput.inputValue();
    console.log("  → after fill:", newVal);
  }

  // Preview à droite : combien d'inputs ?
  console.log("\n=== Preview pane (right side) ===");
  const previewArea = page.locator(".g6k-simulator-api");
  const previewVisible = await previewArea.isVisible().catch(() => false);
  console.log("Preview area visible:", previewVisible);
  if (previewVisible) {
    const inputs = await previewArea.locator("input, select").count();
    console.log("Inputs in preview:", inputs);

    // Récupérer les labels
    const labels = await previewArea.locator(".fr-label").allTextContents();
    console.log("Preview labels:", labels.slice(0, 10));
  }

  await page.screenshot({ path: "/tmp/editor-5-final.png", fullPage: true });
}

await browser.close();
console.log("\nDone.");
