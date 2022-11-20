"use strict";
// import puppeteer from 'puppeteer';
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
const puppeteer = require('puppeteer');
const fs = require('fs');
const auctionLinks = [
    "https://www.just-whisky.co.uk/225-january-2016",
    "https://www.just-whisky.co.uk/226-february-2016",
    "https://www.just-whisky.co.uk/227-march-2016",
    "https://www.just-whisky.co.uk/228-april-2016",
    "https://www.just-whisky.co.uk/229-may-2016",
    "https://www.just-whisky.co.uk/231-june-2016",
    "https://www.just-whisky.co.uk/233-july-2016",
    "https://www.just-whisky.co.uk/234-august-2016",
    "https://www.just-whisky.co.uk/235-september-2016",
    "https://www.just-whisky.co.uk/236-october-2016",
    "https://www.just-whisky.co.uk/237-november-2016",
    "https://www.just-whisky.co.uk/238-december-2016",
    "https://www.just-whisky.co.uk/245-january-2017",
    "https://www.just-whisky.co.uk/246-february-2017",
    "https://www.just-whisky.co.uk/247-march-2017",
    "https://www.just-whisky.co.uk/248-april-2017",
    "https://www.just-whisky.co.uk/250-june-2017",
    "https://www.just-whisky.co.uk/251-july-2017",
    "https://www.just-whisky.co.uk/252-august-2017",
    "https://www.just-whisky.co.uk/253-september-2017",
    "https://www.just-whisky.co.uk/254-october-2017",
    "https://www.just-whisky.co.uk/255-november-2017",
    "https://www.just-whisky.co.uk/256-december-2017",
    "https://www.just-whisky.co.uk/259-january-2018",
    "https://www.just-whisky.co.uk/260-february-2018",
    "https://www.just-whisky.co.uk/261-march-2018",
    "https://www.just-whisky.co.uk/262-april-2018",
    "https://www.just-whisky.co.uk/263-may-2018",
    "https://www.just-whisky.co.uk/264-june-2018",
    "https://www.just-whisky.co.uk/265-july-2018",
    "https://www.just-whisky.co.uk/266-august-2018",
    "https://www.just-whisky.co.uk/267-september-2018",
    "https://www.just-whisky.co.uk/268-october-2018",
    "https://www.just-whisky.co.uk/269-november-2018",
    "https://www.just-whisky.co.uk/270-december-2018",
    "https://www.just-whisky.co.uk/272-january-2019",
    "https://www.just-whisky.co.uk/273-february-2019",
    "https://www.just-whisky.co.uk/276-march-2019",
    "https://www.just-whisky.co.uk/278-april-2019",
    "https://www.just-whisky.co.uk/279-may-2019",
    "https://www.just-whisky.co.uk/280-june-2019",
    "https://www.just-whisky.co.uk/281-july-2019",
    "https://www.just-whisky.co.uk/282-august-2019",
    "https://www.just-whisky.co.uk/284-october-2019",
    "https://www.just-whisky.co.uk/285-november-2019",
    "https://www.just-whisky.co.uk/286-december-2019",
    "https://www.just-whisky.co.uk/287-january-2020",
    "https://www.just-whisky.co.uk/291-april-2020",
    "https://www.just-whisky.co.uk/292-may-2020",
    "https://www.just-whisky.co.uk/293-june-2020",
    "https://www.just-whisky.co.uk/294-july-2020",
    "https://www.just-whisky.co.uk/295-august-2020",
    "https://www.just-whisky.co.uk/296-september-2020",
    "https://www.just-whisky.co.uk/297-october-2020",
    "https://www.just-whisky.co.uk/298-november-2020",
    "https://www.just-whisky.co.uk/299-december-2020",
    "https://www.just-whisky.co.uk/302-january-2021",
    "https://www.just-whisky.co.uk/305-february-2021",
    "https://www.just-whisky.co.uk/306-march-2021",
    "https://www.just-whisky.co.uk/307-april-2021",
    "https://www.just-whisky.co.uk/308-may-2021",
    "https://www.just-whisky.co.uk/309-june-2021",
    "https://www.just-whisky.co.uk/310-july-2021",
    "https://www.just-whisky.co.uk/311-august-2021",
    "https://www.just-whisky.co.uk/312-september-2021",
    "https://www.just-whisky.co.uk/313-october-2021",
    "https://www.just-whisky.co.uk/314-november-2021",
    "https://www.just-whisky.co.uk/315-december-2021",
    "https://www.just-whisky.co.uk/319-january-2022",
    "https://www.just-whisky.co.uk/320-february-2022",
    "https://www.just-whisky.co.uk/321-march-2022",
    "https://www.just-whisky.co.uk/322-april-2022",
    "https://www.just-whisky.co.uk/323-may-2022",
    "https://www.just-whisky.co.uk/325-july-2022",
    "https://www.just-whisky.co.uk/326-august-2022",
    "https://www.just-whisky.co.uk/327-september-2022",
    "https://www.just-whisky.co.uk/191-june-2015",
    "https://www.just-whisky.co.uk/192-july-2015",
    "https://www.just-whisky.co.uk/193-august-2015",
    "https://www.just-whisky.co.uk/194-september-2015",
    "https://www.just-whisky.co.uk/220-october-2015",
    "https://www.just-whisky.co.uk/223-november-2015"
];
function GetAuctionPageCount(browser, url) {
    return __awaiter(this, void 0, void 0, function* () {
        let page = yield browser.newPage();
        yield page.goto(url);
        let bottleLots = yield page.evaluate(() => {
            var _a;
            let pagination = (_a = document.getElementById("pagination")) === null || _a === void 0 ? void 0 : _a.children[0];
            let lastPage = pagination === null || pagination === void 0 ? void 0 : pagination.children[pagination.children.length - 2].textContent;
            return lastPage;
        });
        yield page.close();
        return parseInt(bottleLots);
    });
}
function GetBottleLotsFromAuction(browser, url) {
    return __awaiter(this, void 0, void 0, function* () {
        let page = yield browser.newPage();
        yield page.goto(url);
        let bottleLots = yield page.evaluate(() => {
            let lots = document.getElementsByClassName("product_img_link");
            let lotURLs = [];
            for (let i = 0; i < lots.length; i++) {
                lotURLs.push(lots[i].getAttribute("href"));
            }
            return lotURLs;
        });
        yield page.close();
        return bottleLots;
    });
}
function GetBottleURLs(browser) {
    return __awaiter(this, void 0, void 0, function* () {
        let bottleURLs = [];
        for (let i = 0; i < auctionLinks.length; i++) {
            console.log(`Indexing auction ${i + 1} of ${auctionLinks.length}`);
            let pageCount = yield GetAuctionPageCount(browser, auctionLinks[i] + "#/auction-all");
            let auctionBottles = [];
            for (let pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
                console.log(`Getting page ${pageIndex} of ${pageCount}`);
                let pageBottles = yield GetBottleLotsFromAuction(browser, auctionLinks[i] + "#/auction-all/page-" + pageIndex);
                auctionBottles.push(...pageBottles);
            }
            fs.writeFileSync(`src/tools/scraping/justwhisky/out/urls/auction_${i}.json`, JSON.stringify(auctionBottles));
            bottleURLs.push(...auctionBottles);
        }
        return bottleURLs;
    });
}
function GetBottleDetails(browser, bottleURL) {
    return __awaiter(this, void 0, void 0, function* () {
        let page = yield browser.newPage();
        yield page.goto(bottleURL);
        let bottleDetails = yield page.evaluate(() => {
            var _a, _b, _c;
            let pageTitle = document.getElementsByTagName("h1")[0].innerText;
            let pageDescription = (_a = document.getElementById("short_description_content")) === null || _a === void 0 ? void 0 : _a.innerText;
            let pageImage = (_b = document.getElementById("MagicZoomPlusImageMainImage")) === null || _b === void 0 ? void 0 : _b.getAttribute("href");
            let winningBid = (_c = document.getElementById("our_price_display")) === null || _c === void 0 ? void 0 : _c.innerHTML.replace("Winning Bid: ", "");
            const GetDateFinish = () => {
                let x = document.getElementsByTagName("span");
                for (let i = 0; i < x.length; i++) {
                    let r = x[i].innerText.match(/(\d{2})-(\d{2})-(\d{4})/);
                    if (r != null) {
                        return r[0];
                    }
                }
            };
            let dateFinish = GetDateFinish();
            let extraInfoElement = document.getElementById("idTab2");
            let extraInfoList = [];
            if (extraInfoElement != undefined && extraInfoElement != null) {
                for (let i = 0; i < extraInfoElement.childElementCount; i++) {
                    let element = extraInfoElement.children[i].innerText;
                    let elementSplit = element.replace(" ", "").split(":");
                    extraInfoList.push({ [elementSplit[0].toLowerCase().replace("/", "").replace(" ", "_")]: elementSplit[1] });
                }
            }
            return {
                title: pageTitle,
                description: pageDescription,
                image: pageImage,
                winningBid: winningBid,
                dateFinish: dateFinish,
                extraInfo: extraInfoList
            };
        });
        yield page.close();
        bottleDetails.url = bottleURL;
        return bottleDetails;
    });
}
function GetBottleURLsFromFiles() {
    let bottleURLs = [];
    for (let i = 0; i < auctionLinks.length; i++) {
        let auctionBottles = JSON.parse(fs.readFileSync(`src/tools/scraping/justwhisky/out/urls/auction_${i}.json`).toString());
        bottleURLs.push(...auctionBottles);
    }
    return bottleURLs;
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser = yield puppeteer.launch();
        let bottleURLs = (yield GetBottleURLsFromFiles());
        let bottleDetails = [];
        for (let i = 40001; i < bottleURLs.length; i++) {
            if (i % 5000 == 0 && i != 0) {
                // write to file every 5000 bottles
                fs.writeFileSync(`src/tools/scraping/justwhisky/out/bottleDetails_${i / 5000}.json`, JSON.stringify(bottleDetails));
                bottleDetails = [];
            }
            console.log(`Getting details for bottle ${i + 1} of ${bottleURLs.length}`);
            try {
                let bottle = yield GetBottleDetails(browser, bottleURLs[i]);
                bottleDetails.push(bottle);
            }
            catch (e) {
                console.log(`Error getting details for bottle ${i + 1} of ${bottleURLs.length}`);
            }
        }
        yield browser.close();
    });
}
main();
