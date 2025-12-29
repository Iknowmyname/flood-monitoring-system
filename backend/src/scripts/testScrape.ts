import { scrapeRainNowByState, scrapeWaterLevelNowByState } from "../scrapers/publicInfoBanjirScraper.js";

async function main() {

    const rain = await scrapeRainNowByState("KEL");
    console.log("rain sample:", rain.slice(0,5));

    const water = await scrapeWaterLevelNowByState("KEL");
    console.log("water level sample:", water.slice(0,5));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});