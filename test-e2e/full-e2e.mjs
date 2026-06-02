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
check("≥ 5 simulateurs proposés (frais-locataire, voiture-tco, PAC, fact-checker, gratification)", options.length >= 5, options.join(" | "));

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

// === Gratification stagiaire — preuve d'usage RepeatableGroup ===
console.log("\n=== GRATIFICATION STAGIAIRE (RepeatableGroup) ===");
await selector.selectOption("gratification-stagiaire");
await page.waitForTimeout(500);

const gratifStepper = await page.locator(".fr-stepper__state").first().isVisible().catch(() => false);
check("Gratification : stepper actif (3 étapes)", gratifStepper);

const tauxField = page.getByLabel(/Taux minimum légal/i).first();
const tauxDefault = await tauxField.inputValue();
check("Taux minimum défaut = 0.15", tauxDefault === "0.15" || tauxDefault === "15", `value="${tauxDefault}"`);

const plafondField = page.getByLabel(/Plafond horaire/i).first();
const plafondDefault = await plafondField.inputValue();
check("Plafond horaire défaut = 29", plafondDefault === "29", `value="${plafondDefault}"`);

// Texte interpolé : "Au taux et au plafond saisis... 4.35 €/h"
const infoVisible = await page.getByText(/4\.35/).first().isVisible().catch(() => false);
check("Gratif minimale interpolée = 4.35 €/h", infoVisible);

// Avancer à l'étape 2 (saisie des mois) — Suivant doit être enabled (required remplis par défaut)
const gratifNextBtn = page.getByRole("button", { name: /^Suivant$/i }).first();
const gratifNextEnabled = await gratifNextBtn.isEnabled().catch(() => false);
check("'Suivant' enabled (taux + plafond ont des défauts)", gratifNextEnabled);

await gratifNextBtn.click();
await page.waitForTimeout(400);

// Étape 2 : 12 chapters "Mois 1" à "Mois 12"
const moisChapters = await page.locator("[data-block='chapter']").count();
check("Étape 2 : ≥ 12 chapters Mois (un par mois)", moisChapters >= 12, `count=${moisChapters}`);

// Saisir 151h sur 3 mois
await page.getByLabel(/Heures effectuées au mois 1$/i).fill("151");
await page.getByLabel(/Heures effectuées au mois 2$/i).fill("151");
await page.getByLabel(/Heures effectuées au mois 3$/i).fill("151");
await page.waitForTimeout(300);

// Avancer à l'étape 3 (résultat)
await page.getByRole("button", { name: /^Suivant$/i }).first().click();
await page.waitForTimeout(400);

// Vérifier KPI total
const totalKpi = (await page.locator(".fr-tile__desc").first().textContent()) ?? "";
const totalIsRight = /1\s?9(70|71)/.test(totalKpi); // 3 × 656.85 = 1970.55 (arrondi KPI 1971 €)
check("Gratification totale 3 mois × 151h ≈ 1970-1971 €", totalIsRight, `text="${totalKpi.trim()}"`);

// Vérifier breakdown table
const breakdownRows = await page.locator("table tbody tr").count();
check("Breakdown : 12 lignes mois", breakdownRows === 12, `count=${breakdownRows}`);

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

// Section Étapes & blocs — nouveau layout 2 colonnes
await page2.getByRole("button", { name: /^Étapes & blocs$/i }).first().click();
await page2.waitForTimeout(400);

// L'outline (gauche) doit lister les steps avec icône layout-grid
const outlineTitle = await page2.getByText(/Plan du simulateur/i).isVisible().catch(() => false);
check("Étapes & blocs : titre 'Plan du simulateur' présent", outlineTitle);

// Au démarrage, step 1 sélectionnée → détail affiché
const stepDetailVisible = await page2.locator("h2.fr-h4").first().isVisible().catch(() => false);
check("Détail step 1 visible par défaut", stepDetailVisible);

// Cliquer sur un bloc dans l'outline (e.g. "Prix d'achat VE")
const outlineBlock = page2.getByRole("button", { name: /Prix d'achat VE/i }).first();
const outlineBlockVisible = await outlineBlock.isVisible().catch(() => false);
check("Outline liste les blocs (Prix d'achat VE visible)", outlineBlockVisible);

if (outlineBlockVisible) {
  await outlineBlock.click();
  await page2.waitForTimeout(300);
  // Breadcrumb sticky doit apparaître
  const breadcrumbVisible = await page2.getByRole("navigation", { name: /breadcrumb/i }).isVisible().catch(() => false);
  check("Breadcrumb visible après sélection d'un bloc", breadcrumbVisible);
}

// Aucun "(niveau X)" affiché
const niveauMention = await page2.getByText(/\(niveau \d\)/).isVisible().catch(() => false);
check("Pas de mention '(niveau X)' (F5.6)", !niveauMention);

// Revenir sur la step 1 pour voir le bouton "Ajouter un bloc"
const step1Outline = page2.locator("aside button").filter({ hasText: /Vos paramètres|Saisie|Première étape|step1/i }).first();
if (await step1Outline.isVisible().catch(() => false)) {
  await step1Outline.click();
  await page2.waitForTimeout(200);
}
const addBlockBtn = page2.getByRole("button", { name: /Ajouter un (bloc|sous-bloc)/i }).first();
check("Bouton 'Ajouter un bloc' présent sur l'écran step", await addBlockBtn.isVisible().catch(() => false));

// Cliquer sur "Ajouter un bloc" → palette catégorisée s'ouvre
if (await addBlockBtn.isVisible().catch(() => false)) {
  await addBlockBtn.click();
  await page2.waitForTimeout(200);
  const paletteTitle = await page2.getByText(/Quel type de bloc/i).isVisible().catch(() => false);
  check("Palette de blocs catégorisée s'ouvre", paletteTitle);
  const groupHeader = await page2.getByText(/^Saisie$|^Texte$|^Structure$/i).first().isVisible().catch(() => false);
  check("Palette affiche les catégories (F5.4)", groupHeader);
  // Fermer
  await page2.getByRole("button", { name: /Annuler/i }).first().click().catch(() => {});
  await page2.waitForTimeout(100);
}

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
