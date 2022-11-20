"use strict";
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
async function GetArchive(con) {
    await con.query("SELECT DISTINCT CONCAT( auction_month, ' ', auction_year ) as CompleteDate from bottles", function (_err, result) {
        var archive_dates = [];
        for (var i = 0; i < result.length; i++) {
            archive_dates.push(result[i]['CompleteDate']);
        }
        fs.writeFileSync("src/scraping/output/Archive.json", JSON.stringify(archive_dates));
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
async function GetAuctions(con, page_index) {
    // Make sure the archive file is up to date
    await GetArchive(con);
    // Launch Pupeteer and navigate to the correct page
    const br = await puppeteer.launch();
    const page = await br.newPage();
    const archive_dates = fs.readFileSync("src/scraping/output/Archive.json", { encoding: 'utf-8' });
    await page.goto(`https://whiskyauctioneer.com/auctions/past-auctions?page=${page_index}`);
    const t = await page.evaluate(() => {
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
    await br.close();
}
/**
 * Uses Pupeteer to iterate through all the lots in a given auction
 * and gets the link to those lots.
 *
 * Will then run the GetBottleInformation function on each lot.
 * @param {*} url
 * @param {*} con
 */
async function GetLots(url, con) {
    // Launch Pupeteer
    const br = await puppeteer.launch();
    const page = await br.newPage();
    await page.goto(url);
    // Get all the info from the page and store in 't'
    const t = await page.evaluate(() => {
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
    await br.close();
    // If there were listings for bottles on the page get the
    // respective bottle information
    if (bottles_urls.length > 0) {
        await GetBottleInformation(bottles_urls, con, fileName[fileName.length - 1]);
        console.log(`Completed Lot: ${fileName[fileName.length - 1]}`);
    }
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
async function GetBottleInformation(bottle_urls, con, auction_name) {
    const br = await puppeteer.launch();
    const page = await br.newPage();
    var bottle_info = [];
    // Iterate through all the bottles in the set
    for (var i = 0; i < bottle_urls.length; i++) {
        await page.goto(bottle_urls[i]);
        // Evaluate the current page
        const t = await page.evaluate(() => {
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
    await br.close();
    return bottle_info;
}
/**
 * Reads through the auctions file and iterates through all the URLs.
 * Then begins indexing for each URL.
 */
async function GetAllBottleInfo(page_index) {
    var con = mysql.createConnection(info_mysql.getSQL());
    await GetAuctions(con, page_index);
    const auctions = JSON.parse(fs.readFileSync("src/scraping/output/Auctions.json").toString());
    for (var i = 0; i < auctions.length; i++) {
        console.log(`Beginning Lot... ( ${i} / ${auctions.length} )`);
        await GetLots(auctions[i], con);
    }
    con.end();
}
async function main() {
    for (var i = 0; i <= 11; i++) {
        console.log(`Indexing Page: ${i}`);
        await GetAllBottleInfo(i);
    }
}
//GetAllBottleInfo();
main();
