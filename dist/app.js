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
// Imports
const mysql = require("mysql2");
const express = require("express");
const session = require("express-session");
const formidable = require('formidable');
const fs = require('fs');
const datastore = require("./data_store");
const mysql_info = require("./data_store");
const signupuser = require("./accounts/signup");
const signinuser = require("./accounts/signin");
const signindev = require("./accounts/signin_dev");
const aggregate_data = require("./cellar/aggregate_data");
const search_bottles = require("./cellar/searchbottles");
const stripe = require("stripe")("sk_test_51LovjPKEEf3nQINuGi9Xmh7DZkzMl0BLVLEqV09nKYRPcoLDu3LL1NdZRMk1zxXbKER6nWIPcGsHEqcuGSzuOblt006wiFzyj0");
// Init Express app
const app = express();
// Setting config in Express
app.use(express.static(__dirname + '/../public'));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(session({
    secret: datastore.getSecretKey(),
    resave: true,
    saveUninitialized: true,
}));
const ALLOWED_IPS = [
    "109.170.228.245"
];
/**
 * Keeps us logged in during development as the session will be
 * lost every time the server restarts.
 */
app.use(function (req, res, next) {
    //req.session.development_id = undefined;
    if (req.path == "/auth/dev/login" || req.path == "/auth/dev/login/err" || req.path == "/signindev/") {
        next();
    }
    else {
        if (req.session.development_id || ALLOWED_IPS.includes(req.socket.remoteAddress)) {
            req.session.sID = "f7e35a73-9dc9-4f5a-b6da-fa1420ba3972";
            if (req.path != "/signin/" && req.path != "/signup/" && req.path != "/") {
                if (!req.session.sID) {
                    res.redirect("/");
                }
                else {
                    CheckIfUserIsSubscribed(req.session.sID).then((subscribed) => {
                        if (subscribed == 1) {
                            next();
                        }
                        else {
                            res.send({
                                "message": "You are not subscribed to the newsletter. Please subscribe to continue."
                            });
                        }
                    });
                }
            }
            else {
                next();
            }
        }
        else {
            res.redirect("/auth/dev/login");
        }
    }
});
const port = 3000;
// Function Definitions
function GetAllBottleSales(bottleID) {
    // create a promise to return
    return new Promise((resolve, reject) => {
        let time = new Date().getTime();
        const con = mysql.createConnection(mysql_info.getSQL());
        con.connect(function (err) {
            return __awaiter(this, void 0, void 0, function* () {
                if (err)
                    throw err;
                // Create a new entry
                con.query("SELECT * from bottle_sales WHERE model_id=?;", [bottleID], function (err, resultSet) {
                    let results = Array.from(resultSet);
                    console.log("Query took: " + (new Date().getTime() - time) + " ms");
                    resolve(results);
                    con.end();
                });
            });
        });
    });
}
function SortBottleSalesByAuctionHouse(bottleID, bottleSales) {
    return __awaiter(this, void 0, void 0, function* () {
        if (bottleSales == undefined) {
            bottleSales = yield GetAllBottleSales(bottleID);
        }
        let allSalesPerAuctionHouse = {};
        for (let i = 0; i < bottleSales.length; i++) {
            let sale = bottleSales[i];
            if (allSalesPerAuctionHouse[sale['website_url']] == undefined) {
                allSalesPerAuctionHouse[sale['website_url']] = [parseFloat(sale['price'].replace("£", "").replace(",", ""))];
            }
            else {
                allSalesPerAuctionHouse[sale['website_url']].push(parseFloat(sale['price'].replace("£", "").replace(",", "")));
            }
        }
        return allSalesPerAuctionHouse;
    });
}
function GetTotalSalesByAuctionHouse(SalesByAuctionHouse) {
    return __awaiter(this, void 0, void 0, function* () {
        let totalSalesByAuctionHouse = {};
        let auctionHouseNames = Object.keys(SalesByAuctionHouse);
        for (let i = 0; i < auctionHouseNames.length; i++) {
            let auctionHouseName = auctionHouseNames[i];
            let sales = SalesByAuctionHouse[auctionHouseName];
            let totalSales = 0;
            for (let j = 0; j < sales.length; j++) {
                totalSales += sales[j];
            }
            totalSalesByAuctionHouse[auctionHouseName] = [totalSales, sales.length];
        }
        return totalSalesByAuctionHouse;
    });
}
function GetAverageSaleByAuctionHouse(totalSalesByAuctionHouse) {
    return __awaiter(this, void 0, void 0, function* () {
        let averageSalesByAuctionHouse = {};
        let auctionHouseNames = Object.keys(totalSalesByAuctionHouse);
        for (let i = 0; i < auctionHouseNames.length; i++) {
            let auctionHouseName = auctionHouseNames[i];
            let totalSales = totalSalesByAuctionHouse[auctionHouseName][0];
            let numberOfSales = totalSalesByAuctionHouse[auctionHouseName][1];
            averageSalesByAuctionHouse[auctionHouseName] = (totalSales / numberOfSales).toFixed(2);
        }
        return averageSalesByAuctionHouse;
    });
}
function GetMostProfitableAuctionHousePerBottle(modelID, bottleSales) {
    return __awaiter(this, void 0, void 0, function* () {
        let allSalesPerAuctionHouse = bottleSales != undefined ? yield SortBottleSalesByAuctionHouse(modelID, bottleSales)
            : yield SortBottleSalesByAuctionHouse(modelID);
        let totalSalesByAuctionHouse = yield GetTotalSalesByAuctionHouse(allSalesPerAuctionHouse);
        let averageSalesByAuctionHouse = yield GetAverageSaleByAuctionHouse(totalSalesByAuctionHouse);
        let auctionHouseNames = Object.keys(averageSalesByAuctionHouse);
        let mostProfitableAuctionHouse = null;
        for (let i = 0; i < auctionHouseNames.length; i++) {
            if (mostProfitableAuctionHouse == null) {
                mostProfitableAuctionHouse = auctionHouseNames[i];
            }
            else {
                if (parseFloat(averageSalesByAuctionHouse[auctionHouseNames[i]]) >
                    averageSalesByAuctionHouse[mostProfitableAuctionHouse]) {
                    mostProfitableAuctionHouse = auctionHouseNames[i];
                }
            }
        }
        return mostProfitableAuctionHouse;
    });
}
function GetBottleInfo(bottle_id, callback) {
    const con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        if (err)
            throw err;
        con.query('SELECT * FROM bottle_models WHERE id=?;', [bottle_id], function (err, resultSet) {
            let bottle_info = Array.from(resultSet);
            if (bottle_info.length > 0) {
                callback(bottle_info[0]);
                con.end();
            }
            else {
                callback({
                    "id": "null"
                });
                con.end();
            }
        });
    });
}
function RetrieveUserID(sessionID, callback) {
    const con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        if (err)
            throw err;
        con.query("SELECT id from users WHERE sessionID=?;", [sessionID], function (err, resultSet) {
            let results = Array.from(resultSet);
            if (results.length > 0) {
                callback(results[0]['id']);
            }
            else {
                callback(-1);
            }
            con.end();
        });
    });
}
function RetrieveUserIDAsync(sessionID) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            RetrieveUserID(sessionID, (userID) => {
                resolve(userID);
            });
        });
    });
}
function AddToCellar(user_id, bottle_id, quantity, purchasePrice, purchaseDate) {
    const con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        return __awaiter(this, void 0, void 0, function* () {
            if (err)
                throw err;
            // Create a new entry
            for (var i = 0; i < quantity; i++) {
                yield con.promise().query("INSERT into user_bottles ( user_id, bottle_id, purchase_date, purchase_price ) VALUES ( ?, ?, ?, ? );", [user_id, bottle_id, purchaseDate, purchasePrice]);
            }
            con.end();
        });
    });
}
function AddBottlesToCellar(user_id, bottle_id, purchaseInfo) {
    return new Promise((resolve, reject) => {
        const con = mysql.createConnection(mysql_info.getSQL());
        con.connect(function (err) {
            return __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    resolve(false);
                    throw err;
                }
                for (let i = 0; i < purchaseInfo.length; i++) {
                    let purchase = purchaseInfo[i];
                    yield con.promise().query("INSERT into user_bottles ( user_id, bottle_id, purchase_date, purchase_price ) VALUES ( ?, ?, ?, ? );", [user_id, bottle_id, purchase.purchase_date, purchase.purchase_price]);
                }
                con.end();
                resolve(true);
            });
        });
    });
}
function GetCellarContent(userID, callback) {
    const con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        if (err)
            throw err;
        con.query("SELECT * from user_bottles WHERE user_id=?;", [userID], function (err, resultSet) {
            let results = Array.from(resultSet);
            callback(results);
            con.end();
        });
    });
}
function GetWishlistContent(userID, callback) {
    const con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        if (err)
            throw err;
        con.query("SELECT * from user_wish_bottles WHERE user_id=?;", [userID], function (err, resultSet) {
            let results = Array.from(resultSet);
            callback(results);
            con.end();
        });
    });
}
// AddToWishlist. Check the database to see if the bottle is already in the user's wishlist. If it is, do nothing. If it isn't, add it.
function AddToWishlist(user_id, bottle_id) {
    const con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        return __awaiter(this, void 0, void 0, function* () {
            if (err)
                throw err;
            // Check to see if the bottle is already in the user's wishlist
            con.query("SELECT * from user_wish_bottles WHERE user_id=? AND bottle_id=?;", [user_id, bottle_id], function (err, resultSet) {
                let results = Array.from(resultSet);
                if (results.length == 0) {
                    // Create a new entry
                    con.query("INSERT into user_wish_bottles ( user_id, bottle_id ) VALUES ( ?, ? );", [user_id, bottle_id]);
                }
                con.end();
            });
        });
    });
}
//RemoveFromWishlist
function RemoveFromWishlist(user_id, bottle_id) {
    const con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        return __awaiter(this, void 0, void 0, function* () {
            if (err)
                throw err;
            // Create a new entry
            yield con.promise().query("DELETE from user_wish_bottles WHERE user_id=? AND bottle_id=?;", [user_id, bottle_id]);
            con.end();
        });
    });
}
function AddBottlesFromSpreadsheet(bottleNameColumn, bottleDateColumn, bottlePriceColumn, sessionID) {
    return __awaiter(this, void 0, void 0, function* () {
        const xlsx = require("xlsx");
        let workbook = xlsx.readFile(`./uploads/${sessionID}/spreadsheet.xlsx`);
        let sheet_name_list = workbook.SheetNames;
        let sheetBottles = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], {
            raw: false,
        });
        let bottles = [];
        let missingBottles = [];
        for (let i = 0; i < sheetBottles.length; i++) {
            let [results, length] = yield search_bottles.GetRelevantBottlesAsync(sheetBottles[i][bottleNameColumn], 1, 0);
            if (results != null) {
                bottles.push({
                    modelID: results[0].id,
                    bottleName: sheetBottles[i][bottleNameColumn],
                    purchaseDate: sheetBottles[i][bottleDateColumn],
                    purchasePrice: sheetBottles[i][bottlePriceColumn]
                });
                // replace all non numeric characters with nothing
                let bottlePrice = parseFloat(sheetBottles[i][bottlePriceColumn].replace(/\D/g, ""));
                let userID = yield RetrieveUserIDAsync(sessionID);
                let purchaseDate = new Date(sheetBottles[i][bottleDateColumn]);
                AddBottlesToCellar(userID, results[0].id, [{
                        purchase_date: !isNaN(purchaseDate.getTime()) ? purchaseDate : new Date(),
                        purchase_price: !isNaN(bottlePrice) ? bottlePrice : 0
                    }]);
            }
            else {
                missingBottles.push(sheetBottles[i][bottleNameColumn]);
            }
        }
        return [bottles, missingBottles];
    });
}
function GetNewsArticles() {
    return new Promise((resolve, reject) => {
        const con = mysql.createConnection(mysql_info.getSQL());
        con.connect(function (err) {
            return __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    resolve(false);
                    throw err;
                }
                con.query("SELECT id, title from articles ORDER BY id DESC LIMIT 0,10;", function (err, resultSet) {
                    let results = Array.from(resultSet).map((article) => article.title);
                    resolve(results);
                    con.end();
                });
            });
        });
    });
}
function CheckIfUserIsSubscribed(sessionID) {
    return new Promise((resolve, reject) => {
        const con = mysql.createConnection(mysql_info.getSQL());
        con.connect(function (err) {
            return __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    resolve(false);
                    throw err;
                }
                let userID = yield RetrieveUserIDAsync(sessionID);
                con.query("SELECT * from users WHERE id=?;", [userID], function (err, resultSet) {
                    let results = Array.from(resultSet);
                    resolve(results[0].subscribed);
                    con.end();
                });
            });
        });
    });
}
/**
 * Routes
 */
app.post('/create-checkout-session/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield stripe.checkout.sessions.create({
        line_items: [
            {
                price: 'price_1LovszKEEf3nQINuvjgMWzxJ',
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: 'https://www.google.com',
        cancel_url: 'https://www.facebook.com',
    });
    //res.json({ id: session.id });
    res.redirect(303, session.url);
}));
app.get('/', (req, res) => {
    if (!req.session.sID) {
        res.render("index");
    }
    else {
        res.redirect("dashboard/");
    }
});
app.get('/test/', (req, res) => {
    res.render("test");
});
app.get('/dashboard/', (req, res) => {
    let aggregateBottles = [];
    //anchor
    let GetAggregateFunc = (model_id) => {
        return new Promise((resolve, reject) => {
            let bottle_info = null;
            let average_sales = null;
            let most_profitable_auction_house = null;
            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve([bottle_info, average_sales]);
                }
            };
            aggregate_data.GetBottleInfo(model_id, (i) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    };
    RetrieveUserID(req.session.sID, (userID) => {
        GetCellarContent(userID, (cellar_content) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results) => {
                    aggregateBottles.push(results);
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: "bottles", timeScale: "Max", cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
});
app.get('/dashboard/filter=:filter', (req, res) => {
    let filter = req.params.filter;
    let aggregateBottles = [];
    //anchor
    let GetAggregateFunc = (model_id) => {
        return new Promise((resolve, reject) => {
            let bottle_info = null;
            let average_sales = null;
            let most_profitable_auction_house = null;
            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve([bottle_info, average_sales]);
                }
            };
            aggregate_data.GetBottleInfo(model_id, (i) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    };
    RetrieveUserID(req.session.sID, (userID) => {
        GetCellarContent(userID, (cellar_content) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results) => {
                    aggregateBottles.push(results);
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: filter, timeScale: "Max", cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
});
app.get('/dashboard/timescale=:timescale', (req, res) => {
    let timescale = req.params.timescale;
    let aggregateBottles = [];
    //anchor
    let GetAggregateFunc = (model_id) => {
        return new Promise((resolve, reject) => {
            let bottle_info = null;
            let average_sales = null;
            let most_profitable_auction_house = null;
            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve([bottle_info, average_sales]);
                }
            };
            aggregate_data.GetBottleInfo(model_id, (i) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    };
    RetrieveUserID(req.session.sID, (userID) => {
        GetCellarContent(userID, (cellar_content) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results) => {
                    aggregateBottles.push(results);
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: "bottles", timeScale: timescale, cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
});
app.get('/dashboard/filter=:filter/timescale=:timescale', (req, res) => {
    let filter = req.params.filter;
    let timescale = req.params.timescale;
    let aggregateBottles = [];
    //anchor
    let GetAggregateFunc = (model_id) => {
        return new Promise((resolve, reject) => {
            let bottle_info = null;
            let average_sales = null;
            let most_profitable_auction_house = null;
            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve([bottle_info, average_sales]);
                }
            };
            aggregate_data.GetBottleInfo(model_id, (i) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    };
    RetrieveUserID(req.session.sID, (userID) => {
        GetCellarContent(userID, (cellar_content) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results) => {
                    aggregateBottles.push(results);
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: filter, timeScale: timescale, cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
});
app.get('/dashboard/timescale=:timescale/filter=:filter', (req, res) => {
    let filter = req.params.filter;
    let timescale = req.params.timescale;
    let aggregateBottles = [];
    //anchor
    let GetAggregateFunc = (model_id) => {
        return new Promise((resolve, reject) => {
            let bottle_info = null;
            let average_sales = null;
            let most_profitable_auction_house = null;
            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve([bottle_info, average_sales]);
                }
            };
            aggregate_data.GetBottleInfo(model_id, (i) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    };
    RetrieveUserID(req.session.sID, (userID) => {
        GetCellarContent(userID, (cellar_content) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results) => {
                    aggregateBottles.push(results);
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: filter, timeScale: timescale, cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
});
app.get('/wishlist/', (req, res) => {
    res.render("cellar/wishlist");
});
app.get('/browse/', (req, res) => {
    res.render("cellar/cellarsearch");
});
app.get("/bottle/:id", (req, res) => {
    const bottle_id = req.path.replaceAll("%20", " ").split('/')[2];
    const purchased = req.query.purchased;
    GetBottleInfo(bottle_id, (bottle_info) => {
        res.render("cellar/bottle", {
            bottle_id: bottle_info['id'],
            pageTitle: bottle_info['pageTitle'],
            pageDescription: bottle_info['pageDescription'],
            distillery: bottle_info['distillery'],
            age: bottle_info['age'],
            vintage: bottle_info['vintage'],
            bottled_strength: bottle_info['bottled_strength'],
            bottle_size: bottle_info['bottle_size'],
            image_url: bottle_info['image_url'],
            website_url: bottle_info['website_url'].split("//")[1].split("/")[0],
            timeframe: "Max",
            purchased: purchased != undefined ? purchased : false
        });
    });
});
app.get("/bottle/:id/:timeframe", (req, res) => {
    const bottle_id = req.path.replaceAll("%20", " ").split('/')[2];
    GetBottleInfo(bottle_id, (bottle_info) => {
        res.render("cellar/bottle", {
            bottle_id: bottle_info['id'],
            pageTitle: bottle_info['pageTitle'],
            pageDescription: bottle_info['pageDescription'],
            distillery: bottle_info['distillery'],
            age: bottle_info['age'],
            vintage: bottle_info['vintage'],
            bottled_strength: bottle_info['bottled_strength'],
            bottle_size: bottle_info['bottle_size'],
            image_url: bottle_info['image_url'],
            website_url: bottle_info['website_url'].split("//")[1].split("/")[0],
            timeframe: req.params.timeframe,
            purchased: false
        });
    });
});
/**
 * User account routes
 */
app.get('/auth/dev/login', (req, res) => {
    res.render("accounts/dev_signin", { err: false });
});
app.get('/auth/dev/login/err', (req, res) => {
    res.render("accounts/dev_signin", { err: true });
});
app.get('/signin/', (req, res) => {
    res.render("accounts/signin", { err: false });
});
app.get('/signin/:err', (req, res) => {
    res.render("accounts/signin", { err: true });
});
app.get('/signup/', (req, res) => {
    res.render("accounts/signup", { err: false });
});
app.get('/signup/:err', (req, res) => {
    res.render("accounts/signup", { err: true });
});
app.post('/signupuser/', (req, res) => {
    var userData = req.body;
    var user = signupuser.SignUpUser(userData['username'], "t", "t", userData['email'], userData['password']);
    if (user) {
        res.redirect("/");
    }
    else {
        res.redirect("/signup/err");
    }
});
app.post('/signindev/', (req, res) => {
    var userData = req.body;
    signindev.SignInUserDEV(userData['username'], userData['password'], (uuid) => {
        if (uuid != null) {
            req.session.development_id = uuid;
            res.redirect("/");
        }
        else {
            res.redirect("/auth/dev/login/err");
        }
    });
});
app.post('/signinuser/', (req, res) => {
    var userData = req.body;
    signinuser.SignInUser(userData['username'], userData['password'], (uuid) => {
        if (uuid != null) {
            req.session.sID = uuid;
            res.redirect('/');
        }
        else {
            res.redirect('/signin/err');
        }
    });
});
app.get('/myaccount/', (req, res) => {
    if (req.session.sID) {
        res.render("accounts/myaccount");
    }
    else {
        res.redirect("/signin/");
    }
});
/**
 * Cellar Routes
 */
app.get('/upload_spreadsheet/', (req, res) => {
    res.render("cellar/spreadsheet_upload");
});
app.get('/comparison/bottle/:modelID', (req, res) => {
    let modelID = req.params.modelID;
    let GetBottleSalesInfo = () => __awaiter(void 0, void 0, void 0, function* () {
        let allSalesPerAuctionHouse = yield SortBottleSalesByAuctionHouse(modelID);
        let totalSalesByAuctionHouse = yield GetTotalSalesByAuctionHouse(allSalesPerAuctionHouse);
        let averageSalesByAuctionHouse = yield GetAverageSaleByAuctionHouse(totalSalesByAuctionHouse);
        return averageSalesByAuctionHouse;
    });
    GetBottleInfo(modelID, (bottleInfo) => {
        GetBottleSalesInfo().then((averageSalesByAuctionHouse) => {
            res.render("cellar/comparison", {
                bottleInfo: JSON.stringify(bottleInfo),
                averageSalesByAuctionHouse: JSON.stringify(averageSalesByAuctionHouse),
                pageTitle: bottleInfo['pageTitle'],
                distillery: bottleInfo['distillery'],
                age: bottleInfo['age'],
                imgURL: bottleInfo['image_url'],
            });
        });
    });
});
app.get('/bottle_not_found/:missingBottles', (req, res) => {
    res.render("cellar/missingbottles", {
        missingBottles: JSON.parse(req.params.missingBottles)
    });
});
/**
 * API Endpoints
 */
app.post('/api/v1/finish_spreadsheet', (req, res) => {
    let bottleName = req.body.bottleName;
    let purchaseDate = req.body.purchaseDate;
    let purchasePrice = req.body.purchasePrice;
    AddBottlesFromSpreadsheet(bottleName, purchaseDate, purchasePrice, req.session.sID).then((result) => {
        if (result[1].length != 0) {
            res.redirect(`/bottle_not_found/${encodeURIComponent(JSON.stringify(result[1]))}`);
        }
        else {
            res.redirect("/dashboard/");
        }
    });
});
app.get("/api/v1/get_news_articles", (req, res) => {
    GetNewsArticles().then((newsArticles) => {
        res.send(newsArticles);
    });
});
app.get("/api/v1/parse_spreadsheet", (req, res) => {
    const xlsx = require("xlsx");
    let workbook = xlsx.readFile(`./uploads/${req.session.sID}/spreadsheet.xlsx`);
    let sheet_name_list = workbook.SheetNames;
    let sheetBottles = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
    let columnHeadings = Object.keys(sheetBottles[0]);
    res.render('cellar/spreadsheet_parse', {
        columnHeadings: columnHeadings,
    });
});
app.post('/api/v1/upload_file', (req, res) => {
    let form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        if (err)
            throw err;
        if (!fs.existsSync(`./uploads/${req.session.sID}`)) {
            fs.mkdirSync(`./uploads/${req.session.sID}`);
        }
        let oldpath = files.filetoupload.filepath;
        let fileExtension = files.filetoupload.originalFilename.split('.').pop();
        let excelFileFormats = ["xlsx", "xlsm", "xlsb", "xltx", "xltm", "xls", "xlt", "xml",
            "xlam", "xla", "xlw", "xlr"];
        if (excelFileFormats.includes(fileExtension)) {
            let newpath = `./uploads/${req.session.sID}/spreadsheet.${fileExtension}`;
            fs.rename(oldpath, newpath, (err) => {
                if (err)
                    throw err;
                res.redirect('/api/v1/parse_spreadsheet');
                res.end();
            });
        }
        else {
            res.send("Unsupported File Format!");
        }
    });
});
app.get('/api/v1/get_aggregate/:model_id', (req, res) => {
    const model_id = req.path.replaceAll("%20", " ").split('/')[4];
    let bottle_info = null;
    let average_sales = null;
    let most_profitable_auction_house = null;
    let startTime = new Date().getTime();
    let SQL_COMPLETE = () => {
        if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
            bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
            res.send([bottle_info, average_sales]);
        }
    };
    aggregate_data.GetBottleInfo(model_id, (i) => {
        bottle_info = i;
        //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
        SQL_COMPLETE();
    });
    // Ineffecient
    GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse) => {
        most_profitable_auction_house = auctionHouse;
        //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
        SQL_COMPLETE();
    });
    // Ineffecient
    aggregate_data.GetAveragesByMonthYear(model_id, (r) => {
        average_sales = r;
        //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
        SQL_COMPLETE();
    });
});
app.get('/api/v1/bottle_information/:bottleID', (req, res) => {
    GetBottleInfo(req.params.bottleID, (r) => {
        res.send(r);
    });
});
app.get('/api/v1/search_bottles_legacy/:dis/:age/:abv/:vol/:rescount/:currentPage', (req, res) => {
    const dis = req.params.dis;
    const age = req.params.age;
    const abv = req.params.abv;
    const vol = req.params.vol;
    const rescount = parseInt(req.params.rescount);
    const currentPage = parseInt(req.params.currentPage);
    search_bottles.GetRelevantBottles(dis != "any" ? dis : "", age != "any" ? age : "", abv != "any" ? abv : "", vol != "any" ? vol : "", rescount, currentPage, (bottleList, resultCount) => {
        res.send([bottleList, resultCount]);
    });
});
app.get('/api/v1/search_bottles/:searchQuery/:rescount/:currentPage', (req, res) => {
    const searchQuery = req.params.searchQuery;
    const rescount = parseInt(req.params.rescount);
    const currentPage = parseInt(req.params.currentPage);
    search_bottles.GetRelevantBottles(searchQuery != "any" ? searchQuery : "", rescount, currentPage, (bottleList, resultCount) => {
        res.send([bottleList, resultCount]);
    });
});
app.get('/api/v1/add_to_cellar/:bottleID/:purchaseInfo', (req, res) => {
    const bottle_id = req.params.bottleID;
    const purchaseInfo = JSON.parse(req.params.purchaseInfo);
    RetrieveUserID(req.session.sID, (user_id) => {
        AddBottlesToCellar(user_id, bottle_id, purchaseInfo);
        res.send(true);
    });
});
app.get('/api/v1/get_cellar_content/', (req, res) => {
    RetrieveUserID(req.session.sID, (userID) => {
        GetCellarContent(userID, (cellar_content) => {
            res.send(cellar_content);
        });
    });
});
app.get('/api/v1/get_wishlist_content/', (req, res) => {
    RetrieveUserID(req.session.sID, (userID) => {
        GetWishlistContent(userID, (wishlist_content) => {
            res.send(wishlist_content);
        });
    });
});
app.get(`/api/v1/add_to_wishlist/:bottleID`, (req, res) => {
    const bottle_id = req.params.bottleID;
    RetrieveUserID(req.session.sID, (user_id) => {
        AddToWishlist(user_id, bottle_id);
        res.redirect('/wishlist/');
    });
});
app.get(`/api/v1/remove_from_wishlist/:bottleID`, (req, res) => {
    const bottle_id = req.params.bottleID;
    RetrieveUserID(req.session.sID, (user_id) => {
        RemoveFromWishlist(user_id, bottle_id);
        res.redirect('/wishlist/');
    });
});
app.get('/api/v1/get_most_profitable_auction_house/:modelID', (req, res) => {
    const modelID = req.params.modelID;
    GetMostProfitableAuctionHousePerBottle(modelID).then((r) => {
        res.send([r]);
    });
    //res.send("test");
});
// Start the development server
app.listen(port, "0.0.0.0", () => {
    console.log("Development server started on port: " + port);
});
