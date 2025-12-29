import { chromium } from "playwright";

const rainFallURL = 'https://publicinfobanjir.water.gov.my/hujan/data-hujan/?state=KEL&lang=en';

const browser = await chromium.launch({headless: true});
const page = await browser.newPage();

await page.goto(rainFallURL, { waitUntil: "domcontentloaded", timeout: 60_000 });

await page.waitForSelector("#normaltable1 tbody tr td", { timeout: 30_000 });

const theadrows = await page.evaluate(() => {

    const table = document.querySelector<HTMLTableElement>('#normaltable1');

    if (!table) return [];

    const trows = table.querySelectorAll("thead tr");

    const thirdRow = trows[2];

    return Array.from(thirdRow.querySelectorAll("th")).map(th => th.textContent?.trim() || "");

    

});

await page.close();
await browser.close();

console.log(theadrows);




