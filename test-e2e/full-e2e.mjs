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

// === Fact-checker — arbre de décision en mode stepper ===
console.log("\n=== FACT-CHECKER (stepper) ===");
await selector.selectOption("fact-checker-voiture-electrique");
await page.waitForTimeout(500);

// Le stepper DSFR est visible
const stepperVisible = await page.locator(".fr-stepper__state").first().isVisible().catch(() => false);
check("Stepper DSFR visible (mode wizard activé)", stepperVisible);

const stepperState1 = (await page.locator(".fr-stepper__state").first().textContent()) ?? "";
check("Étape 1 sur 2 affichée au démarrage", stepperState1.includes("1 sur 2"), `state="${stepperState1.trim()}"`);

const familleSelect = page.getByLabel(/Quelle famille d'interrogation/i).first();
check("Famille selector visible (étape 1)", await familleSelect.isVisible());

const familleOptions = await familleSelect.locator("option").allTextContents();
check("5 familles + placeholder", familleOptions.length >= 5, `count=${familleOptions.length}`);

// Bouton "Suivant" doit être disabled (famille blank → field required)
const nextBtn = page.getByRole("button", { name: /^Suivant$/i }).first();
const nextDisabledInit = await nextBtn.isDisabled().catch(() => false);
check("'Suivant' disabled tant qu'aucun field required n'est rempli", nextDisabledInit);

// Choisir famille = environment
await familleSelect.selectOption("environment");
await page.waitForTimeout(300);

const sujetSelect = page.getByLabel(/Précisez votre interrogation/i).first();
check("Sujet selector visible après choix famille", await sujetSelect.isVisible());

// Suivant toujours disabled (sujet pas choisi)
const nextStillDisabled = await nextBtn.isDisabled().catch(() => false);
check("'Suivant' toujours disabled après seule famille (sujet required vide)", nextStillDisabled);

// Choisir un sujet
await sujetSelect.selectOption("environment.carbon_footprint");
await page.waitForTimeout(300);

const nextEnabled = await nextBtn.isEnabled().catch(() => false);
check("'Suivant' enabled après sujet choisi", nextEnabled);

// On reste à l'étape 1 tant qu'on n'a pas cliqué Suivant : le chapter de réponse n'est pas visible
const carbonBeforeNext = await page.getByText("Bilan carbone du véhicule électrique en France").isVisible().catch(() => false);
check("Chapter réponse PAS encore visible avant clic 'Suivant'", !carbonBeforeNext);

// Cliquer Suivant
await nextBtn.click();
await page.waitForTimeout(300);

const stepperState2 = (await page.locator(".fr-stepper__state").first().textContent()) ?? "";
check("Après Suivant : étape 2 sur 2", stepperState2.includes("2 sur 2"), `state="${stepperState2.trim()}"`);

const carbonChapter = await page.getByText("Bilan carbone du véhicule électrique en France").isVisible().catch(() => false);
check("Chapter carbon_footprint visible en étape 2", carbonChapter);

const lithiumChapter = await page.getByText("Lithium et ressources minières").isVisible().catch(() => false);
check("Chapter lithium_mining masqué (autre sujet)", !lithiumChapter);

const carbonStatVisible = await page.getByText(/70 %/i).first().isVisible().catch(() => false);
check("Stat -70 % visible dans le chapitre actif", carbonStatVisible);

const adviceVisible = await page.getByText(/Suède et en Norvège/i).first().isVisible().catch(() => false);
check("Conseil pratique du sujet visible", adviceVisible);

// Le sélecteur famille de l'étape 1 ne doit PAS être visible
const familleStillVisible = await familleSelect.isVisible().catch(() => false);
check("Sélecteur famille masqué en étape 2 (mode stepper = une étape à la fois)", !familleStillVisible);

// Bouton "Recommencer" sur la dernière étape
const restartBtn = page.getByRole("button", { name: /Recommencer/i }).first();
check("Bouton 'Recommencer' visible sur la dernière étape", await restartBtn.isVisible().catch(() => false));

// Retour étape 1 via "Précédent"
const prevBtn = page.getByRole("button", { name: /^Précédent$/i }).first();
await prevBtn.click();
await page.waitForTimeout(300);
const backOnStep1 = (await page.locator(".fr-stepper__state").first().textContent()) ?? "";
check("Précédent ramène à l'étape 1", backOnStep1.includes("1 sur 2"), `state="${backOnStep1.trim()}"`);

// Changer de sujet, puis Suivant → chapter mis à jour
await sujetSelect.selectOption("environment.lithium_mining");
await page.waitForTimeout(200);
await nextBtn.click();
await page.waitForTimeout(300);
const lithiumNow = await page.getByText("Lithium et ressources minières").isVisible().catch(() => false);
check("Après changement de sujet + Suivant : lithium chapter visible", lithiumNow);

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

// Le sidemenu doit lister les 7 sections (Métadonnées / Données / Sources / Étapes / Règles / JSON / Tester)
const sidemenuItems = page2.locator(".fr-sidemenu__list .fr-sidemenu__link");
const sidemenuCount = await sidemenuItems.count();
check("Sidemenu : 7 sections", sidemenuCount === 7, `count=${sidemenuCount}`);

// Boutons d'intégration toujours visibles dans le sidemenu (footer)
const standaloneLink = page2.getByRole("link", { name: /Ouvrir standalone/i }).first();
check("Bouton 'Ouvrir standalone' toujours visible dans le sidemenu", await standaloneLink.isVisible().catch(() => false));

const exportBtn = page2.getByRole("button", { name: /Exporter JSON/i }).first();
check("Bouton 'Exporter JSON' toujours visible dans le sidemenu", await exportBtn.isVisible().catch(() => false));

// Section "Tester" : cliquer dessus, puis vérifier la preview live
await page2.getByRole("button", { name: /^▶ Tester$/i }).click();
await page2.waitForTimeout(300);

const previewBlock = page2.locator(".g6k-simulator").first();
const previewPrixVE = previewBlock.getByLabel(/Prix d'achat VE/i).first();
const previewValue = await previewPrixVE.inputValue();
check("Section Tester : preview affiche default prixVE=35000", previewValue === "35000", `value="${previewValue}"`);

// Modifier dans la preview (mesure perceived reactivity — ≤ 200ms)
const t0 = Date.now();
await previewPrixVE.fill("45000");
await page2.waitForTimeout(150);
const newPreviewKpi = (await previewBlock.locator(".fr-tile__desc").first().textContent()) ?? "";
const elapsed = Date.now() - t0;
check("Preview KPI mis à jour après saisie (moteur local instant)", newPreviewKpi.includes("€"), `text="${newPreviewKpi.trim()}" — ${elapsed}ms`);

// Section Données
await page2.getByRole("button", { name: /^Données$/i }).first().click();
await page2.waitForTimeout(300);
const dataRows = await page2.locator("table tbody tr").count();
check("Section Données : ≥ 10 lignes Data", dataRows >= 10, `count=${dataRows}`);

const firstLabelInput = page2.locator("table tbody tr").first().locator("input").nth(1);
await firstLabelInput.fill("Distance annuelle (km)");
const newLabel = await firstLabelInput.inputValue();
check("Saisie d'un label de Data fonctionne", newLabel === "Distance annuelle (km)");

// Boutons d'intégration restent visibles même en section Données
const exportBtnStillVisible = await page2.getByRole("button", { name: /Exporter JSON/i }).first().isVisible().catch(() => false);
check("'Exporter JSON' reste visible quand on change de section", exportBtnStillVisible);

await browser.close();
console.log(`\n${allOk ? "🎉 TOUS LES TESTS E2E PASSENT" : "❌ DES TESTS ÉCHOUENT"}`);
process.exit(allOk ? 0 : 1);
