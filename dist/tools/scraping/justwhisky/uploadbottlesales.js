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
const mysql = require('mysql');
const fs = require('fs');
const info_mysql = require("../../../data_store");
function RetrieveAllBottlesFromFiles() {
    let files = fs.readdirSync('src/tools/scraping/justwhisky/out');
    let bottles = [];
    for (let file of files) {
        // check file is not a directory
        if (fs.lstatSync('src/tools/scraping/justwhisky/out/' + file).isDirectory() == false) {
            let bottle = JSON.parse(fs.readFileSync('src/tools/scraping/justwhisky/out/' + file));
            bottles = [...bottles, ...bottle];
        }
    }
    return bottles;
}
/**
 * {
        "title": "KARUIZAWA 48 YEARS OLD 1964 - CASK NO. 3603 - WEALTH SOLUTIONS",
        "description": "This is an incredibly sought after, extremely old whisky from the sadly closed Karuizawa distillery in Japan. Aged for over 48 years, this was the oldest expression from the defunct distillery at the time of release. The whisky itself was aged for this extremely long period of maturation in a single Sherry Oak cask and lay undisturbed in a traditional dunnage warehouse at Karuizawa before being bottled at Chichibu Distillery.\n\nBottled from a single 400-litre cask (number 3603), naturally the angels have had their fair share, leaving just enough of the precious liquid to make 143 bottles of this revered Whisky.\n\nOriginally presented to clients of Wealth Solutions, a respected alternative investment firm based in Poland. The Polish link continues, with the bottle being presented in a stunning box partly made from Polish black fossil oak.\n\nBottled at natural cask strength and without colour or chill filtration.\n\nThis Lot comes complete with book written by Dave Broom and features tasting notes from some of the World's most respected whisky writers, all of which agree this is a simply incredible, unique whisky.",
        "image": "https://www.just-whisky.co.uk/42929-thickbox_default/karuizawa-48-years-old-1964-cask-no-3603-wealth-solutions.jpg",
        "winningBid": "£ 15,025.00",
        "dateFinish": "17-01-2016",
        "extraInfo": [
            {
                "strength": "57.7%"
            },
            {
                "bottlesize": " 700ml"
            },
            {
                "distillery_blender": " Karuizawa"
            },
            {
                "distillerystatus": " Closed / Silent"
            },
            {
                "region": "Japan"
            },
            {
                "bottleno": " 20 of 143"
            },
            {
                "caskno": " 3603"
            },
            {
                "casktype": " Sherry"
            },
            {
                "lottype": " Full Size"
            },
            {
                "approximateshipping_weight (!)": " 3.75kg"
            }
        ],
        "url": "https://www.just-whisky.co.uk/january-2016/19507-karuizawa-48-years-old-1964-cask-no-3603-wealth-solutions.html"
    }
 */
/**
 * Get the bottle's age from the bottle page
 * @param bottleInfo The bottle information
 * @returns The bottle's age
 */
function GetBottleAge(bottleInfo) {
    //let age = bottleInfo.pageTitle.match(/(\d+) Year Old/)[1];
    // find number in string when followed by Year Old or Years Old
    let titleAge = bottleInfo.title.match(/(\d+) YEAR[S]? OLD/);
    let descriptionAge = bottleInfo.description.match(/(\d+) YEAR[S]? OLD/);
    if (titleAge != null) {
        return titleAge[1];
    }
    else if (descriptionAge != null) {
        return descriptionAge[1];
    }
    return null;
}
function ConvertToCl(size) {
    const parseFraction = (fractionString) => {
        let fractionSplit = fractionString.split("/");
        return (parseFloat(fractionSplit[0]) / parseFloat(fractionSplit[1]));
    };
    var parsedSize = 0;
    // Convert the string into a floating point
    size.split(" ").forEach(sec => {
        if (sec.includes("/")) {
            // fraction
            let x = parseFraction(sec);
            if (!isNaN(x)) {
                parsedSize += x;
            }
        }
        else {
            // integer
            let x = parseFloat(sec);
            if (!isNaN(x)) {
                parsedSize += x;
            }
        }
    });
    // Convert this to cl
    if (size.toLowerCase().includes("oz")) {
        return parsedSize * 2.957;
    }
    else if (size.toLowerCase().includes("ml")) {
        return parsedSize / 10;
    }
    else if (size.toLowerCase().includes("cl")) {
        return parsedSize;
    }
    else if (size.toLowerCase().includes("l")) {
        return parsedSize * 100;
    }
    else {
        return -1;
    }
    //console.log( sizeNumber );
}
function MergeObjectArray(model) {
    let res = {};
    for (let i = 0; i < model.extraInfo.length; i++) {
        let k = Object.keys(model.extraInfo[i])[0];
        res[k] = model.extraInfo[i][k];
    }
    return res;
}
function GetMonthYearFromString(dateString) {
    let months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];
    let date = dateString.split("-");
    let month = months[parseInt(date[1])];
    let year = parseInt(date[2]);
    return [month, year];
}
function UploadBottleSaleToDatabase(connection, sale, modelID) {
    let [saleMonth, saleYear] = GetMonthYearFromString(sale.dateFinish);
    let salePrice = sale.winningBid.replace(" ", "");
    return new Promise((resolve, reject) => {
        connection.query("INSERT INTO bottle_sales (model_id, price, auction_month, auction_year, website_url) VALUES (?, ?, ?, ?, ?)", [
            modelID,
            salePrice,
            saleMonth,
            saleYear,
            "https://www.just-whisky.co.uk/"
        ], (err, result) => {
            if (err)
                reject(err);
            resolve(result);
        });
    });
}
function SearchDatabaseForMatch(connection, searchString) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM bottle_models WHERE pageTitle=?;";
        connection.query(sql, [searchString], function (err, result) {
            if (err)
                throw err;
            // filter through the results
            let ObjectArray = JSON.parse(JSON.stringify(result));
            resolve(ObjectArray);
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // create connection to mysql database
        let connection = mysql.createConnection(info_mysql.getSQL());
        console.log('Retrieving bottles from files...');
        let bottles = RetrieveAllBottlesFromFiles();
        for (let i = 0; i < bottles.length; i++) {
            let bottle = bottles[i];
            console.log(`Uploading bottle sale to database (${i}/${bottles.length}): ` + bottle.title);
            let matches = yield SearchDatabaseForMatch(connection, bottle.title);
            if (matches.length > 0) {
                //await UploadBottleModelToDatabase(connection, bottle);
                yield UploadBottleSaleToDatabase(connection, bottle, matches[0].id);
            }
            else {
                console.log("Bottle doesn't exist in database, skipping...");
            }
        }
        connection.end();
    });
}
main();
