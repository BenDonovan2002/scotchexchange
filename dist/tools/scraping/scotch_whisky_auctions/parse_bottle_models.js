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
const fs_1 = require("fs");
const path_1 = require("path");
const puppeteer = require("puppeteer");
/**
 * Bypass the age verification which SWA puts in place
 * @param browser The puppeteer browser instance
 * @returns boolean
 */
function ProgressAgeVerification(browser) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = yield browser.newPage();
        yield page.goto("https://www.scotchwhiskyauctions.com/");
        yield page.waitForSelector(".emailsub");
        yield page.evaluate(() => {
            let emailsub = document.getElementsByClassName("emailsub")[0];
            emailsub.click();
        });
        yield page.waitForSelector(".logo");
        yield page.close();
        return true;
    });
}
function GetBottleURLsFromDirectory() {
    const files = (0, fs_1.readdirSync)("src/tools/scraping/scotch_whisky_auctions/out/urls/");
    //console.log( files );
    const bottleURLs = [];
    files.forEach((file) => {
        const data = (0, fs_1.readFileSync)((0, path_1.join)("src/tools/scraping/scotch_whisky_auctions/out/urls/", file), "utf8");
        const json = JSON.parse(data);
        bottleURLs.push(json);
    });
    return bottleURLs;
}
/**
 * Retrieve the bottle information from the given url
 * @param {Page} page
 * @param url
 * @returns
 */
function GetBottleInformation(browser, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = yield browser.newPage();
        try {
            yield page.goto(url);
            yield page.waitForSelector("#contentstart");
        }
        catch (exception) {
            return { ERROR: "Failed to load page" };
        }
        let bottleInfo = yield page.evaluate(() => {
            try {
                let pageTitle = document.getElementById("contentstart").children[0].innerHTML;
                let pageDescription = document.getElementsByClassName("descr")[0].innerHTML;
                let winningBid = document.getElementsByClassName("bidinfo won")[0].innerHTML;
                let imageURL = document.getElementById("lotimg").getAttribute("src").replace("large", "zoom");
                return {
                    pageTitle: pageTitle,
                    pageDescription: pageDescription,
                    winingBid: winningBid,
                    imageURL: imageURL
                };
            }
            catch (exception) {
                return {
                    ERROR: exception,
                };
            }
        });
        page.close();
        return bottleInfo;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const auctions = GetBottleURLsFromDirectory();
        const browser = yield puppeteer.launch({ headless: true });
        yield ProgressAgeVerification(browser);
        for (let i = 136; i <= auctions.length; i++) {
            console.log(`Parsing Auction: ${i}/${auctions.length}`);
            console.log(`\n---------\n`);
            let auction = auctions[i];
            let informationArray = [];
            for (let ii = 0; ii < auction.length; ii++) {
                console.log(`Parsing Bottle: ${ii}/${auction.length}`);
                let bottleInformation = yield GetBottleInformation(browser, auction[ii]);
                bottleInformation.url = auction[ii];
                if (bottleInformation.ERROR) {
                    console.log(bottleInformation.ERROR);
                }
                else {
                    informationArray.push(bottleInformation);
                }
            }
            ;
            // Write the information to a file
            const fileName = `src/tools/scraping/scotch_whisky_auctions/out/bottles/auction_${i}.json`;
            const data = JSON.stringify(informationArray);
            yield (0, fs_1.writeFileSync)(fileName, data, "utf8");
        }
        yield browser.close();
    });
}
main();
