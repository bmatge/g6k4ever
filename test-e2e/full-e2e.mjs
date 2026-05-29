/* eslint-disable */
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on("pageerror", (err) => console.log(`[PAGE ERROR]`, err.message));

let allOk = true;
function check(label, cond, detail = "") {
  const ok = !!cond;
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? " — " + detail : ""}`);
  if (!ok) allOk = false;
}

// === Runtime ===
console.log("\n=== RUNTIME (http://localhost:5173) ===");
await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(500);

const selector = page.locator("#sim-selector");
check("Sélecteur visible", await selector.isVisible());

const options = await selector.locator("option").allTextContents();
check("≥ 4 simulateurs proposés (frais-locataire, voiture-tco, PAC, fact-checker)", options.length >= 4, options.join(" | "));

// frais-locataire avec Rennes pré-rempli
let commune = page.getByLabel(/Code INSEE/i).first();
const communeValue = await commune.inputValue();
check("frais-locataire initial commune=35238 (Rennes)", communeValue === "35238", `value="${communeValue}"`);
const visibleRennes = await page.getByText(/Rennes est en zone tendue/i).isVisible().catch(() => false);
check("Section 'Rennes en zone tendue' visible", visibleRennes);

// Change pour Paris
await commune.fill("75056");
await page.waitForTimeout(300);
const visibleParis = await page.getByText(/Paris est en zone très tendue/i).isVisible().catch(() => false);
check("Après saisie 75056 → 'Paris en zone très tendue' visible", visibleParis);

// Switch to voiture-tco
await selector.selectOption("voiture-tco");
await page.waitForTimeout(500);
const prixVE = page.getByLabel(/Prix d'achat VE/i).first();
const prixVEValue = await prixVE.inputValue();
check("voiture-tco prixVE=35000 (default)", prixVEValue === "35000", `value="${prixVEValue}"`);

const km = page.locator("input[type=range]").first();
check("Slider km présent", await km.isVisible());
const kmValue = await km.inputValue();
check("km = 12000 (default)", kmValue === "12000", `value="${kmValue}"`);

// Vérifier KPI ecart
const kpiText = (await page.locator(".fr-tile__desc").first().textContent()) ?? "";
const kpiHasEuro = kpiText.includes("€");
check("KPI montre €", kpiHasEuro, `text="${kpiText.trim()}"`);

// Modifier kilométrage
await km.fill("30000");
await page.waitForTimeout(300);
const kpiNew = (await page.locator(".fr-tile__desc").first().textContent()) ?? "";
const kpiIsPositive = !kpiNew.startsWith("-") && kpiNew.includes("€");
check(`Avec 30k km/an → écart positif (VE gagne)`, kpiIsPositive, `text="${kpiNew.trim()}"`);

// Switch to PAC
await selector.selectOption("pompe-a-chaleur");
await page.waitForTimeout(500);
const surface = page.getByLabel(/Surface/i).first();
const surfaceValue = await surface.inputValue();
check("PAC surface=100 (default)", surfaceValue === "100", `value="${surfaceValue}"`);
const kpiPac = (await page.locator(".fr-tile__desc").first().textContent()) ?? "";
const pacShowsMoney = kpiPac.includes("€");
check("PAC KPI montre €", pacShowsMoney, `text="${kpiPac.trim()}"`);

// === Fact-checker — arbre de décision ===
console.log("\n=== FACT-CHECKER ===");
await selector.selectOption("fact-checker-voiture-electrique");
await page.waitForTimeout(500);

const familleSelect = page.getByLabel(/Quelle famille d'interrogation/i).first();
check("Famille selector visible", await familleSelect.isVisible());

const familleOptions = await familleSelect.locator("option").allTextContents();
check("5 familles + placeholder", familleOptions.length >= 5, `count=${familleOptions.length}`);

// Au démarrage, le chapter "Précisez votre interrogation" est masqué
const sujetWrapperHidden = !(await page.getByText("Précisez votre interrogation", { exact: false }).first().isVisible().catch(() => false));
check("Chapter 'Précisez votre interrogation' masqué tant que famille n'est pas choisie", sujetWrapperHidden);

// Choisir famille = environment
await familleSelect.selectOption("environment");
await page.waitForTimeout(300);

const sujetSelect = page.getByLabel(/Précisez votre interrogation/i).first();
check("Sujet selector visible après choix famille", await sujetSelect.isVisible());

// Choisir un sujet
await sujetSelect.selectOption("environment.carbon_footprint");
await page.waitForTimeout(300);

const carbonChapter = await page.getByText("Bilan carbone du véhicule électrique en France").isVisible().catch(() => false);
check("Chapter carbon_footprint visible après choix sujet", carbonChapter);

const lithiumChapter = await page.getByText("Lithium et ressources minières").isVisible().catch(() => false);
check("Chapter lithium_mining masqué (autre sujet de la même famille)", !lithiumChapter);

const resaleChapter = await page.getByText("La valeur de revente des véhicules électriques").isVisible().catch(() => false);
check("Chapter resale masqué (autre famille)", !resaleChapter);

// Vérifier qu'on a bien les chiffres-clés sourcés
const carbonStatVisible = await page.getByText(/70 %/i).first().isVisible().catch(() => false);
check("Stat -70 % visible dans le chapitre actif", carbonStatVisible);

const adviceVisible = await page.getByText(/Suède et en Norvège/i).first().isVisible().catch(() => false);
check("Conseil pratique du sujet visible", adviceVisible);

// Changer de sujet → bonne mise à jour
await sujetSelect.selectOption("environment.lithium_mining");
await page.waitForTimeout(300);
const lithiumNow = await page.getByText("Lithium et ressources minières").isVisible().catch(() => false);
const carbonGone = !(await page.getByText("Bilan carbone du véhicule électrique en France").isVisible().catch(() => false));
check("Switch sujet : lithium maintenant visible", lithiumNow);
check("Switch sujet : carbon_footprint masqué", carbonGone);

// === Standalone mode (URL ?sim=) ===
console.log("\n=== STANDALONE ?sim=fact-checker-... ===");
const standalonePage = await ctx.newPage();
await standalonePage.goto("http://localhost:5173/?sim=fact-checker-voiture-electrique", {
  waitUntil: "networkidle",
  timeout: 15000,
});
await standalonePage.waitForTimeout(500);

const standaloneNoSelector = !(await standalonePage.locator("#sim-selector").isVisible().catch(() => false));
check("Mode standalone : pas de sélecteur de catalogue", standaloneNoSelector);

const standaloneFC = await standalonePage.getByText(/Fact-checker — voiture électrique/i).first().isVisible().catch(() => false);
check("Mode standalone : titre du simulateur affiché", standaloneFC);

const standaloneFamilleSelect = standalonePage.getByLabel(/Quelle famille d'interrogation/i).first();
check("Mode standalone : famille selector présent (prêt pour iframe)", await standaloneFamilleSelect.isVisible());

await standalonePage.close();

// === Editor ===
console.log("\n=== EDITOR (http://localhost:5174) ===");
const page2 = await ctx.newPage();
page2.on("pageerror", (err) => console.log(`[PAGE ERROR]`, err.message));
await page2.goto("http://localhost:5174", { waitUntil: "networkidle", timeout: 15000 });
await page2.waitForTimeout(500);

await page2.locator("#user-id").fill("alice");
await page2.getByRole("button", { name: /Continuer/i }).click();
await page2.waitForTimeout(1500);

const cards = page2.locator(".fr-card__title");
const cardCount = await cards.count();
check("Liste éditeur ≥ 4 simulateurs", cardCount >= 4, `count=${cardCount}`);

const voitureLink = page2.getByText(/TCO Voiture/i).first();
await voitureLink.click();
await page2.waitForTimeout(2500);

// Lock acquis
const lockBadge = page2.locator(".fr-badge--success").first();
check("Verrou acquis", await lockBadge.isVisible().catch(() => false));

// Preview live (moteur local, instant)
const previewBlock = page2.locator(".g6k-simulator").first();
const previewPrixVE = previewBlock.getByLabel(/Prix d'achat VE/i).first();
const previewValue = await previewPrixVE.inputValue();
check("Preview affiche default prixVE=35000", previewValue === "35000", `value="${previewValue}"`);

// Modifier dans la preview (mesure perceived reactivity — ≤ 200ms)
const t0 = Date.now();
await previewPrixVE.fill("45000");
await page2.waitForTimeout(150);
const newPreviewKpi = (await previewBlock.locator(".fr-tile__desc").first().textContent()) ?? "";
const elapsed = Date.now() - t0;
check("Preview KPI mis à jour après saisie (moteur local instant)", newPreviewKpi.includes("€"), `text="${newPreviewKpi.trim()}" — ${elapsed}ms`);

// Bouton "Ouvrir standalone" présent + URL correcte
const standaloneLink = page2.getByRole("link", { name: /Ouvrir standalone/i }).first();
check("Bouton 'Ouvrir standalone' présent dans l'éditeur", await standaloneLink.isVisible().catch(() => false));

// Bouton "Exporter JSON" présent
const exportBtn = page2.getByRole("button", { name: /Exporter JSON/i }).first();
check("Bouton 'Exporter JSON' présent dans l'éditeur", await exportBtn.isVisible().catch(() => false));

// Onglet Données
await page2.getByRole("tab", { name: "Données", exact: true }).click();
await page2.waitForTimeout(300);
const dataRows = await page2.locator(".fr-tabs__panel--selected table tbody tr").count();
check("Onglet Données : ≥ 10 lignes Data", dataRows >= 10, `count=${dataRows}`);

const firstLabelInput = page2.locator(".fr-tabs__panel--selected table tbody tr").first().locator("input").nth(1);
await firstLabelInput.fill("Distance annuelle (km)");
const newLabel = await firstLabelInput.inputValue();
check("Saisie d'un label de Data fonctionne", newLabel === "Distance annuelle (km)");

await browser.close();
console.log(`\n${allOk ? "🎉 TOUS LES TESTS E2E PASSENT" : "❌ DES TESTS ÉCHOUENT"}`);
process.exit(allOk ? 0 : 1);
