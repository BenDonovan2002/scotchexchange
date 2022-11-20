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
const mysql = require("mysql");
const puppeteer = require("puppeteer");
const fs = require("fs");
const info_mysql = require("../data_store");
/**
 * Gets all of the previously indexed auctions by searching the MySQL database
 * and writes it to lib/scraping/output/Archive.json
 * @param {*} con The connection object to the MySQL database
 */
function GetArchive(con) {
    return __awaiter(this, void 0, void 0, function* () {
        yield con.query("SELECT DISTINCT CONCAT( auction_month, ' ', auction_year ) as CompleteDate from bottles", function (_err, result) {
            var archive_dates = [];
            for (var i = 0; i < result.length; i++) {
                archive_dates.push(result[i]['CompleteDate']);
            }
            fs.writeFileSync("src/scraping/output/Archive.json", JSON.stringify(archive_dates));
        });
    });
}
/**
 * Goes to the past auctions webpage through Pupeteer and iterates through all of the
 * different auctions links.
 *
 * After this, it reads the archive file and removes any links to auctions which
 * have already been indexed. Then writes the links to lib\scraping\output\Auctions.json
 * @param {*} con The connection object to the MySQL database
 */
function GetAuctions(con, page_index) {
    return __awaiter(this, void 0, void 0, function* () {
        // Make sure the archive file is up to date
        yield GetArchive(con);
        // Launch Pupeteer and navigate to the correct page
        const br = yield puppeteer.launch();
        const page = yield br.newPage();
        const archive_dates = fs.readFileSync("src/scraping/output/Archive.json", { encoding: 'utf-8' });
        yield page.goto(`https://whiskyauctioneer.com/auctions/past-auctions?page=${page_index}`);
        const t = yield page.evaluate(() => {
            var auctions = Array.from(document.getElementsByClassName("listing-title"));
            var auctionURL = [];
            auctions.forEach(element => {
                var childElement = element.firstElementChild;
                if (childElement.getAttribute("href").includes("news") == false) {
                    if (childElement.getAttribute("href").includes("https://whiskyauctioneer.com")) {
                        auctionURL.push(childElement.getAttribute("href"));
                    }
                    else {
                        auctionURL.push("https://whiskyauctioneer.com" + childElement.getAttribute("href"));
                    }
                }
            });
            return auctionURL;
        });
        // Loop through the results and see which ones are already in the archive file
        var auction_list = [];
        for (var i = 0; i < t.length; i++) {
            var auction_name = t[i].split("/");
            var auction_month = auction_name[auction_name.length - 1].split("-")[0];
            var auction_year = auction_name[auction_name.length - 1].split("-")[1];
            if (JSON.parse(archive_dates).includes(auction_month + " " + auction_year) == false) {
                auction_list.push(t[i]);
            }
        }
        fs.writeFile(`src/scraping/output/Auctions.json`, JSON.stringify(auction_list), (_err) => { });
        yield br.close();
    });
}
/**
 * Uses Pupeteer to iterate through all the lots in a given auction
 * and gets the link to those lots.
 *
 * Will then run the GetBottleInformation function on each lot.
 * @param {*} url
 * @param {*} con
 */
function GetLots(url, con) {
    return __awaiter(this, void 0, void 0, function* () {
        // Launch Pupeteer
        const br = yield puppeteer.launch();
        const page = yield br.newPage();
        yield page.goto(url);
        // Get all the info from the page and store in 't'
        const t = yield page.evaluate(() => {
            var auctions = Array.from(document.getElementsByClassName("views-row"));
            var auctionURL = [];
            auctions.forEach(element => {
                var childElement = element.firstElementChild;
                auctionURL.push(childElement.getAttribute("href"));
            });
            return auctionURL;
        });
        var fileName = url.split("/");
        var bottles_urls = [];
        // Getting the bottles
        for (var i = 0; i < t.length; i++) {
            bottles_urls.push(t[i]);
        }
        yield br.close();
        // If there were listings for bottles on the page get the
        // respective bottle information
        if (bottles_urls.length > 0) {
            yield GetBottleInformation(bottles_urls, con, fileName[fileName.length - 1]);
            console.log(`Completed Lot: ${fileName[fileName.length - 1]}`);
        }
    });
}
/**
 * Gets the information about a gorup of bottles and uploads it
 * as a row in the bottles database.
 * @param {*} bottle_urls The set of bottle URLs to iterate through
 * @param {*} con The connection object for the MySQL database
 * @param {*} auction_name The name of the auction the lots are in
 * so we can put that info in the database
 * @returns A list of all the bottles and their information
 */
function GetBottleInformation(bottle_urls, con, auction_name) {
    return __awaiter(this, void 0, void 0, function* () {
        const br = yield puppeteer.launch();
        const page = yield br.newPage();
        var bottle_info = [];
        // Iterate through all the bottles in the set
        for (var i = 0; i < bottle_urls.length; i++) {
            yield page.goto(bottle_urls[i]);
            // Evaluate the current page
            const t = yield page.evaluate(() => {
                var detailsObject = {};
                var details = Array.from(document.getElementsByClassName("field"));
                var price = Array.from(document.getElementsByClassName("uc-price"))[0].innerHTML;
                var imgURL = document.getElementsByClassName("zoomImg")[0].getAttribute("src");
                details.pop();
                details.forEach((detail) => {
                    var label = detail.firstElementChild.textContent;
                    var label_format = label.substring(0, label.length - 2).toLowerCase();
                    var value = detail.lastElementChild.firstElementChild.textContent;
                    detailsObject[label_format] = value;
                });
                detailsObject['price'] = price;
                detailsObject['imgURL'] = imgURL;
                return detailsObject;
            });
            // Add the most recently indexed bottle to the list to be returned
            bottle_info.push(t);
            // Splits the auction name to get the month and year of the auction
            var auction_date = auction_name.split("-");
            // Insert the info into the database
            var sql = `INSERT INTO bottles ( distillery, age, vintage, region, bottler, cask_type, bottled_strength, bottle_size, distillery_status, price, website_url, auction_month, auction_year, image_url )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`;
            con.query(sql, [t["distillery"], t["age"], t["vintage"], t["region"], t["bottler"], t["cask type"], t["bottled strength"], t["bottle size"], t["distillery status"], t["price"], "https://whiskyauctioneer.com", auction_date[0], auction_date[1], t['imgURL']], function (err, result) {
                if (err) {
                    throw err;
                }
                ;
            });
            console.log("Logged Record: " + i);
        }
        yield br.close();
        return bottle_info;
    });
}
/**
 * Reads through the auctions file and iterates through all the URLs.
 * Then begins indexing for each URL.
 */
function GetAllBottleInfo(page_index) {
    return __awaiter(this, void 0, void 0, function* () {
        var con = mysql.createConnection(info_mysql.getSQL());
        yield GetAuctions(con, page_index);
        const auctions = JSON.parse(fs.readFileSync("src/scraping/output/Auctions.json").toString());
        for (var i = 0; i < auctions.length; i++) {
            console.log(`Beginning Lot... ( ${i} / ${auctions.length} )`);
            yield GetLots(auctions[i], con);
        }
        con.end();
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        for (var i = 0; i <= 11; i++) {
            console.log(`Indexing Page: ${i}`);
            yield GetAllBottleInfo(i);
        }
    });
}
//GetAllBottleInfo();
main();
