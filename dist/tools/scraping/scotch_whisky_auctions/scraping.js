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
// set up puppeteer
const puppeteer = require('puppeteer');
// import fs
const fs = require('fs');
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
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
function GetPageCount(browser, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = yield browser.newPage();
        yield page.goto(url);
        yield page.waitForSelector("#choosepagebottom");
        let pageCount = yield page.evaluate(() => {
            let pageSelect = document.getElementById("choosepagebottom");
            return pageSelect.childElementCount;
        });
        page.close();
        return pageCount;
    });
}
function GetBottleURLsFromPage(browser, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = yield browser.newPage();
        yield page.goto(url);
        yield page.waitForSelector(".lot");
        let bottleURLs = yield page.evaluate(() => {
            let lotElements = document.getElementsByClassName("lot");
            let bottleURLs = [];
            for (let i = 0; i < lotElements.length; i++) {
                let lotElement = lotElements[i];
                bottleURLs.push(lotElement.href);
            }
            return bottleURLs;
        });
        page.close();
        return bottleURLs;
    });
}
function GetBottleURLsFromAuction(browser, url) {
    return __awaiter(this, void 0, void 0, function* () {
        let pageCount = yield GetPageCount(browser, `${url}?page=1`);
        let bottleURLs = [];
        for (let i = 1; i <= pageCount; i++) {
            console.log("Getting bottle URLs from page " + i + " of " + pageCount);
            try {
                let bottlesOnCurrentPage = yield GetBottleURLsFromPage(browser, `${url}?page=${i}`);
                bottleURLs.push(...bottlesOnCurrentPage);
            }
            catch (error) {
                console.log(error);
            }
        }
        return bottleURLs;
    });
}
function GetAuctionURLs(browser) {
    return __awaiter(this, void 0, void 0, function* () {
        let url = "https://www.scotchwhiskyauctions.com/auctions/";
        const page = yield browser.newPage();
        yield page.goto(url);
        yield page.waitForSelector(".auction");
        let auctionURLs = yield page.evaluate(() => {
            let auctionElements = document.getElementsByClassName("auction");
            let auctionURLs = [];
            for (let i = 0; i < auctionElements.length; i++) {
                let auctionElement = auctionElements[i];
                auctionURLs.push(auctionElement.href);
            }
            return auctionURLs;
        });
        return auctionURLs;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // initialize puppeteer
        const browser = yield puppeteer.launch({
            headless: true,
        });
        yield ProgressAgeVerification(browser);
        let auctionURLs = yield GetAuctionURLs(browser);
        for (let i = 47; i < auctionURLs.length; i++) {
            console.log(`${auctionURLs[i]} ( ${i}/${auctionURLs.length} )`);
            let currentAuctionBottles = yield GetBottleURLsFromAuction(browser, auctionURLs[i]);
            fs.writeFileSync(`src/tools/scraping/scotch_whisky_auctions/out/urls/auction_${i}.json`, JSON.stringify(currentAuctionBottles));
        }
        //await GetBottleURLsFromAuction( browser, "https://www.scotchwhiskyauctions.com/auctions/178-the-134th-auction/" );
        yield browser.close();
    });
}
main();
