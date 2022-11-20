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
const puppeteer = require("puppeteer");
const mysql_info = require("../../../data_store");
const fs = require("fs");
/**
 * Scrapes all of the bottle URIs in a given auction page
 * @param page The page instance for Puppeteer
 * @param auctionURI The URI of the auction page to scrape
 * @returns An array of URIs linking to every bottle in an auction
 */
function getBottleLotsFromAuction(page, auctionURI) {
    return __awaiter(this, void 0, void 0, function* () {
        yield page.goto(auctionURI);
        const pageCount = yield page.evaluate(() => {
            let x = document.getElementsByClassName("pagination")[0].children;
            return x[x.length - 2].innerText;
        });
        let auctionInfo = [];
        //pg <= parseInt(pageCount)
        for (let pg = 1; pg <= parseInt(pageCount); pg++) {
            yield page.goto(`${auctionURI}?page=${pg}`);
            console.log(`Getting Bottles For Page: ${pg}/${parseInt(pageCount)}`);
            const pageInfo = yield page.evaluate(() => {
                let x = Array.from(document.getElementsByClassName("itemsList")[0].children);
                let bottleURIS = [];
                for (let i = 0; i < x.length; i++) {
                    let bottleURI = x[i].children[0].children[1].children[1].children[0].getAttribute("href");
                    bottleURIS.push(bottleURI);
                }
                return bottleURIS;
            });
            auctionInfo.push(pageInfo);
        }
        return auctionInfo.flat();
    });
}
/**
 * Go to a specific bottle's page and retrieves the information about it.
 * @returns Array of bottle information
 */
function getBottleInformation(page, bottleURI) {
    return __awaiter(this, void 0, void 0, function* () {
        yield page.goto(bottleURI);
        const pageInfo = yield page.evaluate(() => {
            try {
                /**
             * Strips a string of all non numeric characters
             * @param str The string to strip
             * @returns The numeric characters contained in the string
             */
                function toNumeric(str) {
                    let ALLOWED_CHARS = "0123456789";
                    let fString = "";
                    for (let i = 0; i < str.length; i++) {
                        if (ALLOWED_CHARS.includes(str[i])) {
                            fString += str[i];
                        }
                    }
                    return fString;
                }
                /**
                 * Checks a string to see if it contains any 4 digit numbers and if so
                 * returns the first one
                 * @param str The string to check
                 * @returns A 4 digit number contained in the string
                 */
                function getYearFromString(str) {
                    let sArray = str.split(" ");
                    for (let i = 0; i < sArray.length; i++) {
                        let n = toNumeric(sArray[i]);
                        if (n.length == 4 &&
                            (n.slice(0, 2) == "19" || n.slice(0, 2) == "20")) {
                            return n;
                        }
                    }
                    return null;
                }
                /**
                 * Formats a property or label such that it is suitable to go into the
                 * database
                 * @param prop The string to be formatted
                 */
                const formatProperty = (prop) => {
                    if (prop[0] == " ") {
                        prop = prop.substring(1);
                    }
                    if (prop[prop.length - 1] == " ") {
                        prop = prop.slice(0, -1);
                    }
                    return prop;
                };
                /**
                 * This next section of code creates an array of HTML elements which contain
                 * more information about the bottle. bottlePropertiesParent has a child element
                 * which is a list containing all of these elements. Depending on the layout of the
                 * page, the index of this child element can change and as such we loop through the
                 * children until we find a UL tag.
                 */
                let bottlePropertiesParent = Array.from(document.getElementsByClassName("properties"))[0];
                let bottleProperties = [];
                for (let i = 0; i < bottlePropertiesParent.children.length; i++) {
                    if (bottlePropertiesParent.children[i].tagName == "UL") {
                        bottleProperties = bottlePropertiesParent.children[i].children;
                        break;
                    }
                }
                let propertiesObject = {};
                /**
                 * Grab the distillery name and bottle age. On each page there is a title which is always
                 * in the formation <Distillery Name> - <Age>
                 */
                let docTitle = document.getElementsByClassName("title")[0].children[0].children[0].innerText;
                propertiesObject['pageTitle'] = docTitle;
                let descElement = document.getElementsByClassName("productDescriptionWrapper")[0];
                let paragraphElements = descElement.getElementsByTagName("p");
                let description = "";
                for (let i = 0; i < paragraphElements.length; i++) {
                    description += `${paragraphElements[i].innerText} `;
                }
                propertiesObject['pageDescription'] = description;
                let distilleryName = formatProperty(docTitle.split("-")[0]);
                propertiesObject['distillery'] = distilleryName;
                /**
                 * Grabs the price of the bottle.
                 */
                let bottlePrice = document.getElementsByClassName("GBP show")[0].innerText;
                propertiesObject['price'] = bottlePrice;
                /**
                 * Grabs the date that the bottle sold.
                 */
                let bottleSaleDate = document.getElementsByClassName("priceDesc")[1].innerText;
                propertiesObject['date'] = bottleSaleDate;
                /**
                 * Grabs an image URI for the bottle
                 */
                let imageURI = document.getElementsByClassName("zoom")[0].children[0].src;
                propertiesObject['imageURI'] = imageURI;
                /**
                 * Grab the other bottle properties from the info section
                 */
                for (let i = 0; i < bottleProperties.length; i++) {
                    let propertyObject = bottleProperties[i];
                    let propertyLabel = formatProperty(propertyObject.innerText.split(":")[0].toLowerCase());
                    propertyLabel = propertyLabel.replace(" ", "_");
                    let propertyValue = formatProperty(propertyObject.innerText.split(":")[1]);
                    propertiesObject[propertyLabel] = propertyValue;
                }
                propertiesObject['vintage'] = getYearFromString(docTitle);
                return propertiesObject;
            }
            catch (error) {
                console.log(error);
                return null;
            }
        });
        if (pageInfo != null) {
            pageInfo['uri'] = bottleURI;
        }
        return pageInfo;
    });
}
/**
 * Main entry point for the program. Launches the puppeteer client.
 * Calls: getBottleInformation to grab the bottle informaton.
 */
function __run__() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer.launch({
            headless: true,
        });
        const page = yield browser.newPage();
        let bottleInfoArray = [];
        for (let auctionNumber = 57; auctionNumber <= 80; auctionNumber++) {
            console.log(`Beginning Auction: ${auctionNumber} / 80\n---------\n`);
            try {
                let r = yield getBottleLotsFromAuction(page, `https://www.whiskyhammer.com/auction/past/auc-${auctionNumber}/`);
                for (let i = 0; i < r.length; i++) {
                    console.log(`Bottle ${i} / ${r.length}`);
                    console.log(r[i]);
                    let res = yield getBottleInformation(page, r[i]);
                    bottleInfoArray.push(res);
                }
                fs.writeFileSync(`src/tools/scraping/whiskey_hammer/out/bottles/auc_${auctionNumber}.json`, JSON.stringify(bottleInfoArray));
            }
            catch (error) {
                console.log(`ERROR: Cannot read auction ${auctionNumber}!`);
            }
        }
        yield browser.close();
    });
}
__run__();
