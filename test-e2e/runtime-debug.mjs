import { chromium } from "playwright";

const URL = "http://localhost:5173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => console.log(`[${msg.type()}]`, msg.text()));
page.on("pageerror", (err) => console.log(`[ERR]`, err.message, err.stack?.slice(0, 400)));

await page.goto(URL, { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(500);

// Switch to voiture-tco
await page.locator("#sim-selector").selectOption("voiture-tco");
await page.waitForTimeout(500);

console.log("=== ALL inputs (any visibility) ===");
const allInputs = await page.locator("input").elementHandles();
console.log(`Total <input>: ${allInputs.length}`);
for (let i = 0; i < allInputs.length; i++) {
  const el = allInputs[i];
  const props = await el.evaluate((e) => ({
    type: e.type,
    id: e.id,
    name: e.name,
    value: e.value,
    visible: e.offsetParent !== null,
    className: e.className,
  }));
  console.log(`  [${i}] type=${props.type} id=${props.id} visible=${props.visible} class="${props.className}"`);
}

console.log("\n=== Looking for 'Kilométrage' text ===");
const km = await page.getByText(/Kilométrage/i).count();
console.log("Occurrences of 'Kilométrage':", km);
const duree = await page.getByText(/Durée de possession/i).count();
console.log("Occurrences of 'Durée de possession':", duree);

console.log("\n=== HTML around possible range slider ===");
const ranges = await page.locator("input[type=range]").count();
console.log("input[type=range] count:", ranges);
if (ranges === 0) {
  // Look for divs with class containing 'range'
  const rangeDivs = await page.locator("[class*='range']").count();
  console.log("[class*='range'] divs:", rangeDivs);
}

await browser.close();
