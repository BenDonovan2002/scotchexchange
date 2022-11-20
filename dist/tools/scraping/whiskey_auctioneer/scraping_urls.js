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
    "https://whiskyauctioneer.com/august-2022-auction",
    "https://whiskyauctioneer.com/july-2022-auction",
    "https://whiskyauctioneer.com/june-2022-auction", "https://whiskyauctioneer.com/may-2022-auction",
    "https://whiskyauctioneer.com/may-2022-auction", "https://whiskyauctioneer.com/american-whiskey-enduring-fascination-0", "https://whiskyauctioneer.com/glenfiddich-spirit-speyside-2022-charity-auction", "https://www.whiskyauctioneer.com/april-2022-auction", "https://whiskyauctioneer.com/april-2022-auction", "https://whiskyauctioneer.com/lot/5071041/nc%E2%80%99nean-ainnir-batch-1-10-11-x-70cl-vip-experience-charity-lot", "https://whiskyauctioneer.com/march-2022-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/february-2022-auction", "https://whiskyauctioneer.com/current-auction", "https://whiskyauctioneer.com/lot/5064041/secret-speyside-single-cask-editions-10-x-70cl-charity-lot", "https://whiskyauctioneer.com/january-2022-auction", "https://whiskyauctioneer.com/lot/5062068/brewgooder-x-vault-city-x-bruichladdich-barrel-aged-whisky-sour-4-x-375cl-charity-lot", "https://whiskyauctioneer.com/december-2021-auction", "https://whiskyauctioneer.com/current-auction", "https://whiskyauctioneer.com/ulf-buxruds-rare-malts-auction", "https://whiskyauctioneer.com/november-2021-auction", "https://whiskyauctioneer.com/november-2021-auction", "https://whiskyauctioneer.com/pats-whiskey-grand-finale", "https://whiskyauctioneer.com/october-2021-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/connoisseurs-choice-gordon-macphail", "https://whiskyauctioneer.com/september-2021-auction", "https://whiskyauctioneer.com/september-2021-auction", "https://whiskyauctioneer.com/september-2021-auction", "https://whiskyauctioneer.com/scottish-ballets-sleeping-beauty-auction", "https://whiskyauctioneer.com/august-2021-auction", "https://whiskyauctioneer.com/century-american-whiskey", "https://whiskyauctioneer.com/july-2021-auction", "https://whiskyauctioneer.com/june-2021-auction", "https://whiskyauctioneer.com/emmanuel-drons-refined-selections-samaroli-and-corti-brothers", "https://whiskyauctioneer.com/may-2021-auction", "https://whiskyauctioneer.com/celebration-islay-islay-festival-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/april-2021-auction", "https://whiskyauctioneer.com/bygone-era-golden-age-brora", "https://whiskyauctioneer.com/march-2021-auction", "https://whiskyauctioneer.com/mortlach-through-ages", "https://whiskyauctioneer.com/dramfools-jim-mcewan-signature-collection", "https://whiskyauctioneer.com/february-2021-auction", "https://whiskyauctioneer.com/perfect-2", "https://whiskyauctioneer.com/january-2021-auction", "https://whiskyauctioneer.com/creativity-blending-compass-box", "https://whiskyauctioneer.com/december-2020-auction", "https://whiskyauctioneer.com/journey-discovery-european-bottlers-collection", "https://whiskyauctioneer.com/november-2020-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/glenfiddich-pioneers-whisky", "https://whiskyauctioneer.com/october-2020-auction", "https://whiskyauctioneer.com/heart-soul-bourbon-and-american-whiskey-collection", "https://whiskyauctioneer.com/september-2020-auction", "https://whiskyauctioneer.com/july-2020-auction", "https://whiskyauctioneer.com/ncnean-ainnir-exclusive-auction", "https://whiskyauctioneer.com/june-2020-auction", "https://whiskyauctioneer.com/may-2020-auction", "https://whiskyauctioneer.com/glenfiddich-spirit-speyside-2020-auction-0", "https://whiskyauctioneer.com/april-2020-auction", "https://whiskyauctioneer.com/world-whisky-day-2020-auction", "https://whiskyauctioneer.com/march-2020-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/february-2020-auction", "https://whiskyauctioneer.com/perfect-1", "https://whiskyauctioneer.com/january-2020-auction", "https://whiskyauctioneer.com/december-2019-auction", "https://whiskyauctioneer.com/november-2019-auction", "https://whiskyauctioneer.com/october-2019-auction", "https://whiskyauctioneer.com/japanese-whisky-showcase", "https://whiskyauctioneer.com/september-2019-auction", "https://whiskyauctioneer.com/scotch-whisky-industry-charity-auction", "https://whiskyauctioneer.com/august-2019-auction", "https://whiskyauctioneer.com/july-2019-auction", "https://whiskyauctioneer.com/june-2019-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/islay-festival-auction-2019", "https://whiskyauctioneer.com/may-2019-auction", "https://whiskyauctioneer.com/rum-auction-2018", "https://whiskyauctioneer.com/april-2019-auction", "https://whiskyauctioneer.com/march-2019-auction", "https://whiskyauctioneer.com/moon-import-exclusive-auction", "https://whiskyauctioneer.com/february-2019-auction", "https://whiskyauctioneer.com/january-2019-auction", "https://whiskyauctioneer.com/december-2018-auction", "https://whiskyauctioneer.com/november-2018-auction", "https://whiskyauctioneer.com/october-2018-auction", "https://whiskyauctioneer.com/september-2018-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/teeling-auction", "https://whiskyauctioneer.com/august-2018-auction", "https://whiskyauctioneer.com/july-2018-auction", "https://whiskyauctioneer.com/lakes-genesis-inaugural-whisky-auction", "https://whiskyauctioneer.com/june-2018-auction", "https://whiskyauctioneer.com/feis-ile-auction-2018", "https://whiskyauctioneer.com/may-2018-auction", "https://whiskyauctioneer.com/april-2018", "https://whiskyauctioneer.com/march-2018-auction", "https://whiskyauctioneer.com/february-2018", "https://whiskyauctioneer.com/january-2018-auction", "https://whiskyauctioneer.com/december-2017-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/november-2017-auction", "https://whiskyauctioneer.com/october-2017-auction", "https://whiskyauctioneer.com/private-cadenheads-dumpy-collection-exclusive-auction", "https://whiskyauctioneer.com/september-2017-auction", "https://whiskyauctioneer.com/august-2017-auction", "https://whiskyauctioneer.com/milkhoney-israels-first-single-malt-whisky-inaugural-auction", "https://whiskyauctioneer.com/july-2017-auction", "https://whiskyauctioneer.com/z-june-2017-auction", "https://whiskyauctioneer.com/feis-ile-auction-2017", "https://whiskyauctioneer.com/z-may-2017-auction", "https://whiskyauctioneer.com/z-april-2017-auction", "https://whiskyauctioneer.com/karuizawa-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/march-2017-auction", "https://whiskyauctioneer.com/february-2017-auction", "https://whiskyauctioneer.com/january-2017-auction", "https://whiskyauctioneer.com/december-2016-auction", "https://whiskyauctioneer.com/november-2016-auction", "https://whiskyauctioneer.com/october-2016-auction", "https://whiskyauctioneer.com/september-2016-auction", "https://whiskyauctioneer.com/august-2016-auction", "https://whiskyauctioneer.com/strathearn-distillery-inaugural-whisky-auction", "https://whiskyauctioneer.com/july-2016-auction", "https://whiskyauctioneer.com/june-2016-auction", "https://whiskyauctioneer.com/may-2016-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/april-2016-auction", "https://whiskyauctioneer.com/march-2016-auction", "https://whiskyauctioneer.com/february-2016-auction", "https://whiskyauctioneer.com/january-2016-auction", "https://whiskyauctioneer.com/december-2015-auction", "https://whiskyauctioneer.com/november-2015-auction", "https://whiskyauctioneer.com/october-2015-auction", "https://whiskyauctioneer.com/september-2015-auction", "https://whiskyauctioneer.com/august-2015-auction", "https://whiskyauctioneer.com/july-2015-auction", "https://whiskyauctioneer.com/june-2015-auction", "https://whiskyauctioneer.com/may-2015-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice", "https://whiskyauctioneer.com/april-2015-auction", "https://whiskyauctioneer.com/february-2015-auction", "https://whiskyauctioneer.com/january-2015-auction", "https://whiskyauctioneer.com/december-2014-auction", "https://whiskyauctioneer.com/september-2014-auction", "https://whiskyauctioneer.com/august-2014-auction", "https://whiskyauctioneer.com/july-2014-auction", "https://whiskyauctioneer.com/june-2014-auction", "https://whiskyauctioneer.com/may-2014-auction", "https://whiskyauctioneer.com/april-2014-auction", "https://whiskyauctioneer.com/march-2014-auction",
    "https://whiskyauctioneer.com/international-whisky-day-auction", "https://whiskyauctioneer.com/news/features/whisky-jewel-where-whisky-and-luxury-design-meet", "https://whiskyauctioneer.com/news/auction-highlights/evolution-connoisseurs-choice"
];
function GetAuctionPageCount(browser, auctionLink) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        let page = yield browser.newPage();
        yield page.goto(auctionLink, { waitUntil: 'networkidle2', timeout: 0 });
        let pageCount = yield page.evaluate(() => {
            let pager = document.getElementsByClassName("pager-last last");
            if (pager.length > 0) {
                // @ts-ignore
                return (pager[0].getElementsByTagName("a")[0].getAttribute("href").split("=")[1]);
            }
            else {
                return (-1);
            }
        });
        yield page.close();
        resolve(pageCount);
    }));
}
function GetBottleURLsFromPage(browser, pageURL) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        let page = yield browser.newPage();
        yield page.goto(pageURL, { waitUntil: 'networkidle2', timeout: 0 });
        let bottleURLs = yield page.evaluate(() => {
            let bottleURLs = [];
            let bottleElements = document.getElementsByClassName("producthomepage");
            for (let i = 0; i < bottleElements.length; i++) {
                bottleURLs.push(bottleElements[i].getElementsByTagName("a")[0].getAttribute("href"));
            }
            return bottleURLs;
        });
        yield page.close();
        resolve(bottleURLs);
    }));
}
function GetBottleURLsFromAuction(browser, auctionLink) {
    return __awaiter(this, void 0, void 0, function* () {
        let bottleURLs = [];
        let pageCount = yield GetAuctionPageCount(browser, auctionLink);
        for (let i = 0; i < pageCount; i++) {
            console.log("Getting URLS from page " + i + " of " + pageCount);
            let pageURL = auctionLink + "?page=" + i;
            bottleURLs = bottleURLs.concat(yield GetBottleURLsFromPage(browser, pageURL));
        }
        return bottleURLs;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser = yield puppeteer.launch();
        for (let i = 0; i < auctionLinks.length; i++) {
            console.log("Beginning auction " + i + " of " + auctionLinks.length);
            try {
                let bottleURLs = yield GetBottleURLsFromAuction(browser, auctionLinks[i]);
                fs.writeFileSync("src/tools/scraping/whiskey_auctioneer/out/bottleURLs/auction_" + i + ".json", JSON.stringify(bottleURLs));
            }
            catch (e) {
                console.log(e);
            }
        }
    });
}
main();
