import puppeteer from "puppeteer-core";
import xlsx from "xlsx";

(async () => {
    const browser = await puppeteer.launch({ 
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", 
        headless: true 
    });
    const page = await browser.newPage();

    // Set the navigation timeout value
    page.setDefaultNavigationTimeout(60000);

    await page.goto("https://www.google.com/maps");

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });

    // Type into search box
    await page.waitForSelector("#searchboxinput");
    await page.type("#searchboxinput", "cafes in Delhi");
    await page.keyboard.press("Enter");

    // Wait for search results to load
    await page.waitForSelector(".hfpxzc");
    
    const places = [];

    for (let i = 0; i < 25; i++) {
        console.log(`Fetching cafe #${i + 1}...`);

        const element = await page.evaluateHandle(
            (index) => document.querySelectorAll(".hfpxzc")[index],
            i
        );

        if (element) {
            try {
                await element.click();
                await page.waitForNavigation({ waitUntil: "networkidle2" });
                await page.waitForSelector(".CsEnBe");
                await new Promise(resolve => setTimeout(resolve, 1500));

                const placeName = await page.evaluate(
                    () => document.querySelector(".DUwDvf")?.innerText || "Unknown"
                );

                const existingPlace = places.find((place) => place.Name === placeName);

                if (!existingPlace) {
                    const items = await page.evaluate(
                        () => document.querySelectorAll(".CsEnBe").length
                    );

                    const info = { Name: placeName };

                    for (let j = 0; j < items; j++) {
                        const innerText = await page.evaluate(
                            (index) => document.querySelectorAll(".CsEnBe")[index]?.innerText || "",
                            j
                        );

                        const tooltip = await page.evaluate(
                            (index) =>
                                document.querySelectorAll(".CsEnBe")[index]?.dataset.tooltip || "",
                            j
                        );

                        await new Promise(resolve => setTimeout(resolve, 1000));

                        if (tooltip === "Copy address") {
                            info["Address"] = innerText;
                        } else if (tooltip === "Open website") {
                            info["Website"] = `https://www.${innerText}`;
                        } else if (tooltip === "Copy phone number") {
                            info["Phone Number"] = innerText;
                        } else if (tooltip === "Copy plus code") {
                            info["Plus Code"] = innerText;
                        }
                    }

                    places.push(info);
                }
            } catch (error) {
                console.error("Error fetching details:", error);
            }

            // Scroll down to load more results
            await page.evaluate(() => {
                const scrollElement = document.querySelectorAll(".ecceSd")[1];
                if (scrollElement) scrollElement.scrollBy(0, 300);
            });
        } else {
            break;
        }
    }

    console.log("Cafes data collected:", places);

    // Save results to an Excel file
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(places);
    xlsx.utils.book_append_sheet(wb, ws, "Cafes");
    xlsx.writeFile(wb, "Cafes_Delhi.xlsx");

    await browser.close();
})();
