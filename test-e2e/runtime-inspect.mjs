import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (err) => console.log(`[ERR]`, err.message));

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.locator("#sim-selector").selectOption("voiture-tco");
await page.waitForTimeout(500);

console.log("=== HTML of fr-range divs ===");
const html = await page.evaluate(() => {
  return Array.from(document.querySelectorAll(".fr-range")).map((el) => el.outerHTML);
});
for (let i = 0; i < html.length; i++) {
  console.log(`\n--- fr-range div [${i}] ---`);
  console.log(html[i].slice(0, 600));
}

console.log("\n=== Looking for 'inputType' or React errors in DOM ===");
const reactRootHtml = await page.evaluate(() => document.getElementById("root")?.innerHTML.length ?? 0);
console.log("Root HTML length:", reactRootHtml);

await browser.close();
