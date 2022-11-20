"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
//puppeteer.use(StealthPlugin());
function RetrieveDataFromBottleURL(browser, bottleURL) {
    return __awaiter(this, void 0, void 0, function* () {
        let page = yield browser.newPage();
        /*await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });
    
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36');*/
        yield page.goto(bottleURL);
        yield page.waitForSelector('#main-content');
        let bottleData = yield page.evaluate(() => {
            // @ts-ignore
            let pageTitle = document.getElementsByClassName("right")[0].getElementsByClassName("left-heading")[0].innerText;
            // @ts-ignore
            let winningBid = document.getElementsByClassName("uc-price")[0].innerText;
            let fields = document.getElementsByClassName("field");
            let fieldObjects = [];
            for (let i = 0; i < fields.length; i++) {
                fieldObjects.push(fields[i].innerHTML);
            }
            let imgObject = document.getElementsByClassName("zoomImg")[0];
            let imgURL = imgObject.getAttribute("src");
            return {
                pageTitle: pageTitle,
                winningBid: winningBid,
                fields: fieldObjects,
                imgURL: imgURL
            };
        });
        yield page.close();
        // @ts-ignore
        bottleData["bottleURL"] = bottleURL;
        return bottleData;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser = yield puppeteer.launch({
            headless: false,
        });
        // loop through all files in /src/tools/scraping/whiskey_auctioneer/out/bottleURLs
        // for each file console log the contents
        let bottleURLs = fs.readdirSync('src/tools/scraping/whiskey_auctioneer/out/bottleURLs');
        for (let i = 24; i < bottleURLs.length; i++) {
            try {
                console.log(`Beginning auction ${i} of ${bottleURLs.length}`);
                let bottleURL = bottleURLs[i];
                let bottleURLContents = JSON.parse(fs.readFileSync('src/tools/scraping/whiskey_auctioneer/out/bottleURLs/' + bottleURL, 'utf8'));
                let auctionContents = [];
                for (let ii = 0; ii < bottleURLContents.length; ii++) {
                    console.log(`Beginning bottle ${ii} of ${bottleURLContents.length}`);
                    try {
                        let bottleInfo = yield RetrieveDataFromBottleURL(browser, bottleURLContents[ii]);
                        auctionContents.push(bottleInfo);
                    }
                    catch (e) {
                        console.log(`Error retrieving bottle ${ii} of ${bottleURLContents.length}`);
                    }
                }
                fs.writeFileSync('src/tools/scraping/whiskey_auctioneer/out/bottles/auction_' + i + ".json", JSON.stringify(auctionContents));
            }
            catch (e) {
                console.log(`Error retrieving auction ${i} of ${bottleURLs.length}`);
            }
        }
        yield browser.close();
    });
}
main();
