"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = require("puppeteer");
const mysql = require("mysql2");
const mysql_info = require("../../../data_store");
const fs = require("fs");
/**
 * Scrapes all of the bottle URIs in a given auction page
 * @param page The page instance for Puppeteer
 * @param auctionURI The URI of the auction page to scrape
 * @returns An array of URIs linking to every bottle in an auction
 */
async function getBottleLotsFromAuction(page, auctionURI) {
    await page.goto(auctionURI);
    const pageCount = await page.evaluate(() => {
        let x = document.getElementsByClassName("pagination")[0].children;
        return x[x.length - 2].innerText;
    });
    let auctionInfo = [];
    //pg <= parseInt(pageCount)
    for (let pg = 1; pg <= parseInt(pageCount); pg++) {
        await page.goto(`${auctionURI}?page=${pg}`);
        console.log(`Getting Bottles For Page: ${pg}/${parseInt(pageCount)}`);
        const pageInfo = await page.evaluate(() => {
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
}
/**
 * Go to a specific bottle's page and retrieves the information about it.
 * @returns Array of bottle information
 */
async function getBottleInformation(page, bottleURI) {
    await page.goto(bottleURI);
    const pageInfo = await page.evaluate(() => {
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
        let docTitle = "null - null";
        try {
            docTitle = document.getElementsByClassName("title")[0].children[0].children[0].innerText;
        }
        catch (error) {
            console.log("Couldn't grab title");
        }
        let distilleryName = formatProperty(docTitle.split("-")[0]);
        propertiesObject['distillery'] = distilleryName;
        /**
         * Grabs the price of the bottle.
         */
        let bottlePrice = "0";
        try {
            bottlePrice = document.getElementsByClassName("GBP show")[0].innerText;
        }
        catch (e) {
            console.log("Couldn't grab bottle price");
        }
        propertiesObject['price'] = bottlePrice;
        /**
         * Grabs the date that the bottle sold.
         */
        let bottleSaleDate = "null";
        try {
            bottleSaleDate = document.getElementsByClassName("priceDesc")[1].innerText;
        }
        catch (error) {
            console.log("Couldn't grab sale date");
        }
        propertiesObject['date'] = bottleSaleDate;
        /**
         * Grabs an image URI for the bottle
         */
        let imageURI = "";
        try {
            imageURI = document.getElementsByClassName("zoom")[0].children[0].src;
        }
        catch (error) {
            console.log("Couldn't fetch image URI");
        }
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
    });
    return pageInfo;
}
async function addSaleToDatabase(bottleModel, insertID) {
    const con = mysql.createConnection(mysql_info.getSQL());
    await con.connect(async function (err) {
        if (err)
            throw err;
        console.log(bottleModel);
        await con.promise().query(`INSERT INTO model_values
                ( model_id, price, auction_month, auction_year, website_url ) VALUES
                ( ?, ?, ?, ?, ? )`, [
            insertID,
            bottleModel['price'],
            bottleModel['date'].replace("SOLD ", "").split("/")[1],
            bottleModel['date'].replace("SOLD ", "").split("/")[2],
            'www.whiskyhammer.com'
        ]);
    });
    con.end();
    return 1;
}
async function addModelToDatabase(bottleModel) {
    const con = mysql.createConnection(mysql_info.getSQL());
    await con.connect(async function (err) {
        if (err)
            throw err;
        if (bottleModel['age'] != undefined) {
            let [rows, fields] = await con.promise().query(`SELECT * FROM bottle_models WHERE
            distillery=? AND age=? and bottled_strength=? AND bottle_size=?`, [bottleModel['distillery'], bottleModel['age'], bottleModel['strength'], bottleModel['size']]);
            if (rows.length == 0) {
                let [x, y] = await con.promise().query(`INSERT INTO bottle_models
                ( distillery, age, vintage, region, bottler, cask_type, bottled_strength, bottle_size, distillery_status, image_url ) VALUES
                ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`, [
                    bottleModel['distillery'],
                    bottleModel['age'],
                    bottleModel['vintage'] == undefined || bottleModel['vintage'] == null ? "N/A" : bottleModel['vintage'],
                    bottleModel['region'] == undefined || bottleModel['region'] == null ? "N/A" : bottleModel['region'],
                    bottleModel['bottler'] == undefined || bottleModel['bottler'] == null ? "N/A" : bottleModel['bottler'],
                    bottleModel['cask_type'] == undefined || bottleModel['cask_type'] == null ? "N/A" : bottleModel['cask_type'],
                    bottleModel['strength'],
                    bottleModel['size'],
                    bottleModel['distillery_status'] == undefined || bottleModel['distillery_status'] == null ? "N/A" : bottleModel['distillery_status'],
                    bottleModel['imageURI']
                ]);
                await addSaleToDatabase(bottleModel, x['insertId']);
            }
            else {
                await addSaleToDatabase(bottleModel, rows[0]['id']);
            }
        }
        else if (bottleModel['vintage'] != undefined) {
            let [rows, fields] = await con.promise().query(`SELECT * FROM bottle_models WHERE
            distillery=? AND vintage=? and bottled_strength=? AND bottle_size=?`, [bottleModel['distillery'], bottleModel['vintage'], bottleModel['strength'], bottleModel['size']]);
            if (rows.length == 0) {
                let [x, y] = await con.promise().query(`INSERT INTO bottle_models
                ( distillery, age, vintage, region, bottler, cask_type, bottled_strength, bottle_size, distillery_status, image_url ) VALUES
                ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`, [
                    bottleModel['distillery'],
                    bottleModel['age'] == undefined || bottleModel['age'] == null ? "N/A" : bottleModel['age'],
                    bottleModel['vintage'],
                    bottleModel['region'] == undefined || bottleModel['region'] == null ? "N/A" : bottleModel['region'],
                    bottleModel['bottler'] == undefined || bottleModel['bottler'] == null ? "N/A" : bottleModel['bottler'],
                    bottleModel['cask_type'] == undefined || bottleModel['cask_type'] == null ? "N/A" : bottleModel['cask_type'],
                    bottleModel['strength'],
                    bottleModel['size'],
                    bottleModel['distillery_status'] == undefined || bottleModel['distillery_status'] == null ? "N/A" : bottleModel['distillery_status'],
                    bottleModel['imageURI']
                ]);
                await addSaleToDatabase(bottleModel, x['insertId']);
            }
            else {
                await addSaleToDatabase(bottleModel, rows[0]['id']);
            }
        }
    });
    con.end();
    return 1;
}
/**
 * Main entry point for the program. Launches the puppeteer client.
 * Calls: getBottleInformation to grab the bottle informaton.
 */
async function __run__() {
    const browser = await puppeteer.launch({
        headless: true,
    });
    const page = await browser.newPage();
    let bottleInfoArray = [];
    for (let auctionNumber = 20; auctionNumber <= 77; auctionNumber++) {
        console.log(`Beginning Auction: ${auctionNumber} / 77\n---------\n`);
        let r = await getBottleLotsFromAuction(page, `https://www.whiskyhammer.com/auction/past/auc-${auctionNumber}/`);
        for (let i = 0; i < r.length; i++) {
            console.log(`Bottle ${i} / ${r.length}`);
            console.log(r[i]);
            let res = await getBottleInformation(page, r[i]);
            bottleInfoArray.push(res);
        }
        fs.writeFileSync(`src/tools/scraping/whiskey_hammer/out/bottles/auc_${auctionNumber}.json`, JSON.stringify(bottleInfoArray));
    }
    await browser.close();
}
__run__();
