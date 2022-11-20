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
const fs = require("fs");
const mysql = require("mysql");
const info_mysql = require("../../../../data_store");
/**
 * Iterates through all of the files in /out/ and retrieves the bottle data.
 * @returns An array of bottle data
 */
function RetrieveBottleDataFromFile() {
    // Iterate through all of the files in /bottles/ and read them as a string
    let bottleFiles = fs.readdirSync("src/tools/scraping/whiskey_hammer/out/bottles/");
    let bottleArray = [];
    for (let i = 0; i < bottleFiles.length; i++) {
        let bottleFile = bottleFiles[i];
        let bottleString = fs.readFileSync(`src/tools/scraping/whiskey_hammer/out/bottles/${bottleFile}`, "utf8");
        let bottleJSON = JSON.parse(bottleString);
        bottleArray = bottleArray.concat(bottleJSON);
    }
    return bottleArray;
}
/**
 * For any given bottle sale, the function will find the model ID for the bottle model
 * which was sold.
 * @param saleObject The bottle sale object to find the ID for
 * @returns The ID of the bottle model which was sold
 */
function GetModelIDForSale(saleObject) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let connection = mysql.createConnection(info_mysql.getSQL());
            connection.connect((err) => {
                if (err) {
                    reject(err);
                }
            });
            let query = `SELECT * FROM bottle_models WHERE distillery = ? AND bottled_strength = ? AND bottle_size = ?`;
            if (saleObject.age != null && saleObject.age != undefined) {
                query += ` AND age = '${saleObject.age}'`;
            }
            if (saleObject.vintage != null && saleObject.vintage != undefined) {
                query += ` AND vintage = '${saleObject.vintage}'`;
            }
            query += ";";
            connection.query(query, [saleObject.distillery, saleObject.strength, saleObject.size], (err, results) => {
                if (err) {
                    reject(err);
                }
                else {
                    if (results.length > 0) {
                        resolve(results[0].id);
                    }
                    else {
                        resolve(-1);
                    }
                }
            });
            connection.end();
        });
    });
}
/**
 *
 * @param bottleSale Creates a bottle sale object which can be inserted into the database
 * @returns The bottle sale object which can be inserted into the database
 */
function CreateBottleSale(bottleSale) {
    return __awaiter(this, void 0, void 0, function* () {
        if (bottleSale == null || bottleSale == undefined) {
            return null;
        }
        let months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        let auctionDate = bottleSale.date.replace("SOLD ", "").split("/");
        let auctionMonth = months[parseInt(auctionDate[1]) - 1];
        let auctionYear = parseInt(auctionDate[2]);
        let modelID = yield GetModelIDForSale(bottleSale);
        if (modelID == -1 || auctionDate == null || auctionDate == undefined || auctionDate.length != 3) {
            return null;
        }
        let bottleSaleObject = {
            model_id: modelID,
            price: bottleSale.price,
            auction_month: auctionMonth,
            auction_year: auctionYear,
            websiteURL: "https://www.whiskyhammer.com/",
        };
        return bottleSaleObject;
    });
}
function InsertBottleSale(bottleSale) {
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection(info_mysql.getSQL());
        connection.connect((err) => {
            if (err) {
                reject(err);
            }
        });
        let query = `INSERT INTO model_values (model_id, price, auction_month, auction_year, website_url) VALUES (?, ?, ?, ?, ?);`;
        connection.query(query, [bottleSale.model_id, bottleSale.price, bottleSale.auction_month, bottleSale.auction_year, bottleSale.websiteURL], (err, results) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(results);
            }
        });
        connection.end();
    });
}
function EraseWhiskeyHammerSales() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let connection = mysql.createConnection(info_mysql.getSQL());
            connection.connect((err) => {
                if (err) {
                    reject(err);
                }
            });
            let query = `DELETE FROM model_values WHERE website_url = 'https://www.whiskyhammer.com/';`;
            connection.query(query, (err, results) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(results);
                }
            });
            connection.end();
        });
    });
}
function __run__(resetTable) {
    return __awaiter(this, void 0, void 0, function* () {
        if (resetTable) {
            yield EraseWhiskeyHammerSales();
        }
        let bottleData = RetrieveBottleDataFromFile();
        for (let i = 0; i < bottleData.length; i++) {
            console.log(`Inserting bottle sale ${i + 1}/${bottleData.length}`);
            let currentBottle = bottleData[i];
            let bottleSale = yield CreateBottleSale(currentBottle);
            if (bottleSale != null) {
                let result = yield InsertBottleSale(bottleSale);
                //console.log(result);
            }
        }
    });
}
__run__(true);
