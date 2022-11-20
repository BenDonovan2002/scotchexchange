// Imports
import * as mysql from 'mysql2';

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

/**
 * Keeps us logged in during development as the session will be
 * lost every time the server restarts.
 */
app.use(function (req: any, res: any, next: any) {
    //req.session.development_id = undefined;
    if (req.path == "/auth/dev/login" || req.path == "/auth/dev/login/err" || req.path == "/signindev/") {
        next();
    } else {
        req.session.development_id = 1;
        if (!req.session.development_id) {
            res.redirect("/auth/dev/login");
        } else {
            req.session.sID = "f7e35a73-9dc9-4f5a-b6da-fa1420ba3972";
            if (req.path != "/signin/" && req.path != "/signup/" && req.path != "/") {
                if (!req.session.sID) {
                    res.redirect("/");
                } else {
                    CheckIfUserIsSubscribed(req.session.sID).then((subscribed: any) => {
                        if (subscribed == 1) {
                            next();
                        } else {
                            res.send({
                                "message": "You are not subscribed to the newsletter. Please subscribe to continue."
                            });
                        }
                    });
                }
            } else {
                next();
            }
        }
    }
});

const port = 3000;

// Function Definitions

function GetAllBottleSales(bottleID: number) {
    // create a promise to return
    return new Promise((resolve, reject) => {
        let time = new Date().getTime();
        const con = mysql.createConnection(mysql_info.getSQL());

        con.connect(async function (err: any) {
            if (err) throw err;

            // Create a new entry
            con.query("SELECT * from bottle_sales WHERE model_id=?;",
                [bottleID], function (err: mysql.QueryError | null, resultSet: any) {
                    let results: any = Array.from(resultSet);
                    console.log("Query took: " + (new Date().getTime() - time) + " ms");
                    resolve(results);
                    con.end();
                });
        });
    });

}

async function SortBottleSalesByAuctionHouse(bottleID: number, bottleSales?: any) {

    if (bottleSales == undefined) {
        bottleSales = await GetAllBottleSales(bottleID);
    }

    let allSalesPerAuctionHouse: any = {};

    for (let i = 0; i < bottleSales.length; i++) {
        let sale = bottleSales[i];
        if (allSalesPerAuctionHouse[sale['website_url']] == undefined) {
            allSalesPerAuctionHouse[sale['website_url']] = [parseFloat(sale['price'].replace("£", "").replace(",", ""))];
        } else {
            allSalesPerAuctionHouse[sale['website_url']].push(parseFloat(sale['price'].replace("£", "").replace(",", "")));
        }
    }

    return allSalesPerAuctionHouse;
}

async function GetTotalSalesByAuctionHouse(SalesByAuctionHouse: any) {
    let totalSalesByAuctionHouse: any = {};

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
}

async function GetAverageSaleByAuctionHouse(totalSalesByAuctionHouse: any) {
    let averageSalesByAuctionHouse: any = {};

    let auctionHouseNames = Object.keys(totalSalesByAuctionHouse);

    for (let i = 0; i < auctionHouseNames.length; i++) {
        let auctionHouseName = auctionHouseNames[i];
        let totalSales = totalSalesByAuctionHouse[auctionHouseName][0];
        let numberOfSales = totalSalesByAuctionHouse[auctionHouseName][1];
        averageSalesByAuctionHouse[auctionHouseName] = (totalSales / numberOfSales).toFixed(2);
    }

    return averageSalesByAuctionHouse;
}

async function GetMostProfitableAuctionHousePerBottle(modelID: number, bottleSales?: any) {

    let allSalesPerAuctionHouse = bottleSales != undefined ? await SortBottleSalesByAuctionHouse(modelID, bottleSales)
        : await SortBottleSalesByAuctionHouse(modelID);

    let totalSalesByAuctionHouse = await GetTotalSalesByAuctionHouse(allSalesPerAuctionHouse);
    let averageSalesByAuctionHouse = await GetAverageSaleByAuctionHouse(totalSalesByAuctionHouse);

    let auctionHouseNames = Object.keys(averageSalesByAuctionHouse);

    let mostProfitableAuctionHouse = null;

    for (let i = 0; i < auctionHouseNames.length; i++) {
        if (mostProfitableAuctionHouse == null) {
            mostProfitableAuctionHouse = auctionHouseNames[i];
        } else {
            if (parseFloat(averageSalesByAuctionHouse[auctionHouseNames[i]]) >
                averageSalesByAuctionHouse[mostProfitableAuctionHouse]) {
                mostProfitableAuctionHouse = auctionHouseNames[i];
            }
        }
    }

    return mostProfitableAuctionHouse;
}

function GetBottleInfo(bottle_id: number, callback: CallableFunction) {

    const con = mysql.createConnection(mysql_info.getSQL());

    con.connect(function (err: any) {
        if (err) throw err;

        con.query('SELECT * FROM bottle_models WHERE id=?;',
            [bottle_id], function (err: mysql.QueryError | null, resultSet: any) {
                let bottle_info = Array.from(resultSet);
                if (bottle_info.length > 0) {
                    callback(bottle_info[0]);
                    con.end();
                } else {
                    callback({
                        "id": "null"
                    });
                    con.end();
                }
            });
    });
}

function RetrieveUserID(sessionID: string, callback: CallableFunction) {
    const con = mysql.createConnection(mysql_info.getSQL());

    con.connect(function (err: any) {
        if (err) throw err;

        con.query("SELECT id from users WHERE sessionID=?;",
            [sessionID], function (err: mysql.QueryError | null, resultSet: any) {
                let results: any = Array.from(resultSet);
                if (results.length > 0) {
                    callback(results[0]['id']);
                } else {
                    callback(-1);
                }
                con.end();
            });
    });
}

async function RetrieveUserIDAsync(sessionID: string) {
    return new Promise((resolve, reject) => {
        RetrieveUserID(sessionID, (userID: number) => {
            resolve(userID);
        });
    });
}

function AddToCellar(user_id: number, bottle_id: number, quantity: number, purchasePrice: number, purchaseDate: number) {
    const con = mysql.createConnection(mysql_info.getSQL());

    con.connect(async function (err: any) {
        if (err) throw err;

        // Create a new entry

        for (var i = 0; i < quantity; i++) {
            await con.promise().query("INSERT into user_bottles ( user_id, bottle_id, purchase_date, purchase_price ) VALUES ( ?, ?, ?, ? );",
                [user_id, bottle_id, purchaseDate, purchasePrice]);
        }
        con.end();
    });
}

function AddBottlesToCellar(user_id: number, bottle_id: number, purchaseInfo: any) {
    return new Promise((resolve, reject) => {
        const con = mysql.createConnection(mysql_info.getSQL());

        con.connect(async function (err: any) {
            if (err) {
                resolve(false);
                throw err;
            }

            for (let i = 0; i < purchaseInfo.length; i++) {
                let purchase = purchaseInfo[i];
                await con.promise().query("INSERT into user_bottles ( user_id, bottle_id, purchase_date, purchase_price ) VALUES ( ?, ?, ?, ? );",
                    [user_id, bottle_id, purchase.purchase_date, purchase.purchase_price]);
            }

            con.end();

            resolve(true);
        });
    });
}

function GetCellarContent(userID: number, callback: CallableFunction) {
    const con = mysql.createConnection(mysql_info.getSQL());

    con.connect(function (err: any) {
        if (err) throw err;

        con.query("SELECT * from user_bottles WHERE user_id=?;",
            [userID], function (err: mysql.QueryError | null, resultSet: any) {
                let results: any = Array.from(resultSet);
                callback(results);
                con.end();
            });
    });
}

function GetWishlistContent(userID: number, callback: CallableFunction) {
    const con = mysql.createConnection(mysql_info.getSQL());

    con.connect(function (err: any) {
        if (err) throw err;

        con.query("SELECT * from user_wish_bottles WHERE user_id=?;",
            [userID], function (err: mysql.QueryError | null, resultSet: any) {
                let results: any = Array.from(resultSet);
                callback(results);
                con.end();
            });
    });
}

// AddToWishlist. Check the database to see if the bottle is already in the user's wishlist. If it is, do nothing. If it isn't, add it.
function AddToWishlist(user_id: number, bottle_id: number) {
    const con = mysql.createConnection(mysql_info.getSQL());

    con.connect(async function (err: any) {
        if (err) throw err;

        // Check to see if the bottle is already in the user's wishlist
        con.query("SELECT * from user_wish_bottles WHERE user_id=? AND bottle_id=?;",
            [user_id, bottle_id], function (err: mysql.QueryError | null, resultSet: any) {
                let results: any = Array.from(resultSet);
                if (results.length == 0) {
                    // Create a new entry
                    con.query("INSERT into user_wish_bottles ( user_id, bottle_id ) VALUES ( ?, ? );",
                        [user_id, bottle_id]);
                }
                con.end();
            });
    });
}

//RemoveFromWishlist
function RemoveFromWishlist(user_id: number, bottle_id: number) {
    const con = mysql.createConnection(mysql_info.getSQL());

    con.connect(async function (err: any) {
        if (err) throw err;

        // Create a new entry
        await con.promise().query("DELETE from user_wish_bottles WHERE user_id=? AND bottle_id=?;",
            [user_id, bottle_id]);
        con.end();
    });
}

async function AddBottlesFromSpreadsheet(bottleNameColumn: string, bottleDateColumn: string, bottlePriceColumn: string, sessionID: string) {
    const xlsx = require("xlsx");

    let workbook = xlsx.readFile(`./uploads/${sessionID}/spreadsheet.xlsx`);

    let sheet_name_list = workbook.SheetNames;

    let sheetBottles: any = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], {
        raw: false,
    });

    let bottles = [];
    let missingBottles = [];

    for (let i = 0; i < sheetBottles.length; i++) {
        let [results, length] = await search_bottles.GetRelevantBottlesAsync(sheetBottles[i][bottleNameColumn], 1, 0);

        if (results != null) {
            bottles.push({
                modelID: results[0].id,
                bottleName: sheetBottles[i][bottleNameColumn],
                purchaseDate: sheetBottles[i][bottleDateColumn],
                purchasePrice: sheetBottles[i][bottlePriceColumn]
            });

            // replace all non numeric characters with nothing
            let bottlePrice = parseFloat(sheetBottles[i][bottlePriceColumn].replace(/\D/g, ""));

            let userID: number = (await RetrieveUserIDAsync(sessionID) as number);
            let purchaseDate = new Date(sheetBottles[i][bottleDateColumn]);
            AddBottlesToCellar(userID, results[0].id, [{
                purchase_date: !isNaN(purchaseDate.getTime()) ? purchaseDate : new Date(),
                purchase_price: !isNaN(bottlePrice) ? bottlePrice : 0
            }]);
        } else {
            missingBottles.push(sheetBottles[i][bottleNameColumn]);
        }
    }

    return [bottles, missingBottles];

}

function GetNewsArticles() {
    return new Promise((resolve, reject) => {
        const con = mysql.createConnection(mysql_info.getSQL());

        con.connect(async function (err: any) {
            if (err) {
                resolve(false);
                throw err;
            }

            con.query("SELECT id, title from articles ORDER BY id DESC LIMIT 0,10;", function (err: mysql.QueryError | null, resultSet: any) {
                let results: any = Array.from(resultSet).map((article: any) => article.title);
                resolve(results);
                con.end();
            });
        });
    });
}

function CheckIfUserIsSubscribed(sessionID: string) {
    return new Promise((resolve, reject) => {
        const con = mysql.createConnection(mysql_info.getSQL());

        con.connect(async function (err: any) {
            if (err) {
                resolve(false);
                throw err;
            }

            let userID: number = (await RetrieveUserIDAsync(sessionID) as number);

            con.query("SELECT * from users WHERE id=?;", [userID], function (err: mysql.QueryError | null, resultSet: any) {
                let results: any = Array.from(resultSet);
                resolve(results[0].subscribed);
                con.end();
            });
        });
    });
}

/**
 * Routes
 */

app.post('/create-checkout-session/', async (req: any, res: any) => {
    const session = await stripe.checkout.sessions.create({
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
});

app.get('/', (req: any, res: any) => {
    if (!req.session.sID) {
        res.render("index");
    } else {
        res.redirect("dashboard/");
    }
});

app.get('/test/', (req: any, res: any) => {
    res.render("test");
});

app.get('/dashboard/', (req: any, res: any) => {
    let aggregateBottles: any = [];
    //anchor
    let GetAggregateFunc = (model_id: number) => {
        return new Promise((resolve, reject) => {
            let bottle_info: any = null;
            let average_sales: any = null;
            let most_profitable_auction_house: any = null;

            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve( [bottle_info, average_sales] );
                }
            }

            aggregate_data.GetBottleInfo(model_id, (i: any) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse: any) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r: any) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    }

    RetrieveUserID(req.session.sID, (userID: number) => {
        GetCellarContent(userID, (cellar_content: any) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results: any) => {
                    aggregateBottles.push( results );
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: "bottles", timeScale: "Max", cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
    
});

app.get('/dashboard/filter=:filter', (req: any, res: any) => {
    let filter: string = req.params.filter;
    let aggregateBottles: any = [];
    //anchor
    let GetAggregateFunc = (model_id: number) => {
        return new Promise((resolve, reject) => {
            let bottle_info: any = null;
            let average_sales: any = null;
            let most_profitable_auction_house: any = null;

            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve( [bottle_info, average_sales] );
                }
            }

            aggregate_data.GetBottleInfo(model_id, (i: any) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse: any) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r: any) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    }

    RetrieveUserID(req.session.sID, (userID: number) => {
        GetCellarContent(userID, (cellar_content: any) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results: any) => {
                    aggregateBottles.push( results );
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: filter, timeScale: "Max", cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
    
});

app.get('/dashboard/timescale=:timescale', (req: any, res: any) => {
    let timescale: string = req.params.timescale;
    let aggregateBottles: any = [];
    //anchor
    let GetAggregateFunc = (model_id: number) => {
        return new Promise((resolve, reject) => {
            let bottle_info: any = null;
            let average_sales: any = null;
            let most_profitable_auction_house: any = null;

            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve( [bottle_info, average_sales] );
                }
            }

            aggregate_data.GetBottleInfo(model_id, (i: any) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse: any) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r: any) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    }

    RetrieveUserID(req.session.sID, (userID: number) => {
        GetCellarContent(userID, (cellar_content: any) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results: any) => {
                    aggregateBottles.push( results );
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: "bottles", timeScale: timescale, cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
});

app.get('/dashboard/filter=:filter/timescale=:timescale', (req: any, res: any) => {
    let filter: string = req.params.filter;
    let timescale: string = req.params.timescale;
    let aggregateBottles: any = [];
    //anchor
    let GetAggregateFunc = (model_id: number) => {
        return new Promise((resolve, reject) => {
            let bottle_info: any = null;
            let average_sales: any = null;
            let most_profitable_auction_house: any = null;

            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve( [bottle_info, average_sales] );
                }
            }

            aggregate_data.GetBottleInfo(model_id, (i: any) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse: any) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r: any) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    }

    RetrieveUserID(req.session.sID, (userID: number) => {
        GetCellarContent(userID, (cellar_content: any) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results: any) => {
                    aggregateBottles.push( results );
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: filter, timeScale: timescale, cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
});

app.get('/dashboard/timescale=:timescale/filter=:filter', (req: any, res: any) => {
    let filter: string = req.params.filter;
    let timescale: string = req.params.timescale;
    let aggregateBottles: any = [];
    //anchor
    let GetAggregateFunc = (model_id: number) => {
        return new Promise((resolve, reject) => {
            let bottle_info: any = null;
            let average_sales: any = null;
            let most_profitable_auction_house: any = null;

            let SQL_COMPLETE = () => {
                if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
                    bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
                    resolve( [bottle_info, average_sales] );
                }
            }

            aggregate_data.GetBottleInfo(model_id, (i: any) => {
                bottle_info = i;
                bottle_info.modelID = model_id;
                //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse: any) => {
                most_profitable_auction_house = auctionHouse;
                //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });

            // Ineffecient
            aggregate_data.GetAveragesByMonthYear(model_id, (r: any) => {
                average_sales = r;
                //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
                SQL_COMPLETE();
            });
        });
    }

    RetrieveUserID(req.session.sID, (userID: number) => {
        GetCellarContent(userID, (cellar_content: any) => {
            for (let i = 0; i < cellar_content.length; i++) {
                GetAggregateFunc(cellar_content[i].bottle_id).then((results: any) => {
                    aggregateBottles.push( results );
                    if (aggregateBottles.length == cellar_content.length) {
                        res.render("cellar/dashboard", { filter: filter, timeScale: timescale, cellar_content: JSON.stringify(cellar_content), aggregate_bottles: JSON.stringify(aggregateBottles) });
                    }
                });
            }
        });
    });
});

app.get('/wishlist/', (req: any, res: any) => {
    res.render("cellar/wishlist");
});

app.get('/browse/', (req: any, res: any) => {
    res.render("cellar/cellarsearch");
});

app.get("/bottle/:id", (req: any, res: any) => {
    const bottle_id = req.path.replaceAll("%20", " ").split('/')[2];
    const purchased = req.query.purchased;
    GetBottleInfo(bottle_id, (bottle_info: any) => {
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

app.get("/bottle/:id/:timeframe", (req: any, res: any) => {
    const bottle_id = req.path.replaceAll("%20", " ").split('/')[2];
    GetBottleInfo(bottle_id, (bottle_info: any) => {
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

app.get('/auth/dev/login', (req: any, res: any) => {
    res.render("accounts/dev_signin", { err: false });
});

app.get('/auth/dev/login/err', (req: any, res: any) => {
    res.render("accounts/dev_signin", { err: true });
});

app.get('/signin/', (req: any, res: any) => {
    res.render("accounts/signin", { err: false });
});

app.get('/signin/:err', (req: any, res: any) => {
    res.render("accounts/signin", { err: true });
});

app.get('/signup/', (req: any, res: any) => {
    res.render("accounts/signup", { err: false });
});

app.get('/signup/:err', (req: any, res: any) => {
    res.render("accounts/signup", { err: true });
});

app.post('/signupuser/', (req: any, res: any) => {
    var userData = req.body;
    var user = signupuser.SignUpUser(userData['username'], "t", "t", userData['email'], userData['password']);
    if (user) {
        res.redirect("/");
    } else {
        res.redirect("/signup/err");
    }
});

app.post('/signindev/', (req: any, res: any) => {
    var userData = req.body;
    signindev.SignInUserDEV(userData['username'], userData['password'], (uuid: any) => {
        if (uuid != null) {
            req.session.development_id = uuid;
            res.redirect("/");
        } else {
            res.redirect("/auth/dev/login/err");
        }
    });
});

app.post('/signinuser/', (req: any, res: any) => {
    var userData = req.body;
    signinuser.SignInUser(userData['username'], userData['password'], (uuid: string | null) => {
        if (uuid != null) {
            req.session.sID = uuid;
            res.redirect('/');
        } else {
            res.redirect('/signin/err');
        }
    });
});

app.get('/myaccount/', (req: any, res: any) => {
    if (req.session.sID) {
        res.render("accounts/myaccount");
    } else {
        res.redirect("/signin/");
    }
});

/**
 * Cellar Routes
 */

app.get('/upload_spreadsheet/', (req: any, res: any) => {
    res.render("cellar/spreadsheet_upload");
});

app.get('/comparison/bottle/:modelID', (req: any, res: any) => {
    let modelID = req.params.modelID;
    let GetBottleSalesInfo = async () => {
        let allSalesPerAuctionHouse = await SortBottleSalesByAuctionHouse(modelID);
        let totalSalesByAuctionHouse = await GetTotalSalesByAuctionHouse(allSalesPerAuctionHouse);
        let averageSalesByAuctionHouse = await GetAverageSaleByAuctionHouse(totalSalesByAuctionHouse);

        return averageSalesByAuctionHouse;
    }

    GetBottleInfo(modelID, (bottleInfo: any) => {
        GetBottleSalesInfo().then((averageSalesByAuctionHouse: any) => {
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

app.get('/bottle_not_found/:missingBottles', (req: any, res: any) => {
    res.render("cellar/missingbottles", {
        missingBottles: JSON.parse(req.params.missingBottles)
    });
});

/**
 * API Endpoints
 */

app.post('/api/v1/finish_spreadsheet', (req: any, res: any) => {
    let bottleName = req.body.bottleName;
    let purchaseDate = req.body.purchaseDate;
    let purchasePrice = req.body.purchasePrice;

    AddBottlesFromSpreadsheet(bottleName, purchaseDate, purchasePrice, req.session.sID).then((result: any) => {
        if (result[1].length != 0) {
            res.redirect(`/bottle_not_found/${encodeURIComponent(JSON.stringify(result[1]))}`);
        } else {
            res.redirect("/dashboard/");
        }

    });
});

app.get("/api/v1/get_news_articles", (req: any, res: any) => {
    GetNewsArticles().then((newsArticles: any) => {
        res.send(newsArticles);
    });
});

app.get("/api/v1/parse_spreadsheet", (req: any, res: any) => {
    const xlsx = require("xlsx");

    let workbook = xlsx.readFile(`./uploads/${req.session.sID}/spreadsheet.xlsx`);

    let sheet_name_list = workbook.SheetNames;

    let sheetBottles: any = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

    let columnHeadings = Object.keys(sheetBottles[0]);

    res.render('cellar/spreadsheet_parse', {
        columnHeadings: columnHeadings,
    });
});

app.post('/api/v1/upload_file', (req: any, res: any) => {
    let form = new formidable.IncomingForm();

    form.parse(req, (err: any, fields: any, files: any) => {
        if (err) throw err;

        if (!fs.existsSync(`./uploads/${req.session.sID}`)) {
            fs.mkdirSync(`./uploads/${req.session.sID}`);
        }

        let oldpath = files.filetoupload.filepath;

        let fileExtension = files.filetoupload.originalFilename.split('.').pop();

        let excelFileFormats = ["xlsx", "xlsm", "xlsb", "xltx", "xltm", "xls", "xlt", "xml"
            , "xlam", "xla", "xlw", "xlr"];

        if (excelFileFormats.includes(fileExtension)) {
            let newpath = `./uploads/${req.session.sID}/spreadsheet.${fileExtension}`;

            fs.rename(oldpath, newpath, (err: any) => {
                if (err) throw err;
                res.redirect('/api/v1/parse_spreadsheet');
                res.end();
            });
        } else {
            res.send("Unsupported File Format!");
        }
    });
});

app.get('/api/v1/get_aggregate/:model_id', (req: any, res: any) => {
    const model_id = req.path.replaceAll("%20", " ").split('/')[4];
    let bottle_info: any = null;
    let average_sales: any = null;
    let most_profitable_auction_house: any = null;
    let startTime = new Date().getTime();

    let SQL_COMPLETE = () => {
        if (bottle_info != null && average_sales != null && most_profitable_auction_house != null) {
            bottle_info.mostProfitableAuctionHouse = most_profitable_auction_house;
            res.send([bottle_info, average_sales]);
        }
    }

    aggregate_data.GetBottleInfo(model_id, (i: any) => {
        bottle_info = i;
        //console.log("GetBottleInfo: " + (new Date().getTime() - startTime) + "ms");
        SQL_COMPLETE();
    });

    // Ineffecient
    GetMostProfitableAuctionHousePerBottle(model_id).then((auctionHouse: any) => {
        most_profitable_auction_house = auctionHouse;
        //console.log("GetMostProfitableAuctionHousePerBottle: " + (new Date().getTime() - startTime) + "ms");
        SQL_COMPLETE();
    });

    // Ineffecient
    aggregate_data.GetAveragesByMonthYear(model_id, (r: any) => {
        average_sales = r;
        //console.log("GetAveragesByMonthYear: " + (new Date().getTime() - startTime) + "ms");
        SQL_COMPLETE();
    });
});

app.get('/api/v1/bottle_information/:bottleID', (req: any, res: any) => {
    GetBottleInfo(req.params.bottleID, (r: any) => {
        res.send(r);
    });
});

app.get('/api/v1/search_bottles_legacy/:dis/:age/:abv/:vol/:rescount/:currentPage', (req: any, res: any) => {
    const dis: string = req.params.dis;
    const age: string = req.params.age;
    const abv: string = req.params.abv;
    const vol: string = req.params.vol;
    const rescount: number = parseInt(req.params.rescount);
    const currentPage: number = parseInt(req.params.currentPage);
    search_bottles.GetRelevantBottles(dis != "any" ? dis : "", age != "any" ? age : "", abv != "any" ? abv : "", vol != "any" ? vol : "", rescount, currentPage, (bottleList: any, resultCount: number) => {
        res.send([bottleList, resultCount]);
    });
});

app.get('/api/v1/search_bottles/:searchQuery/:rescount/:currentPage', (req: any, res: any) => {
    const searchQuery: string = req.params.searchQuery;
    const rescount: number = parseInt(req.params.rescount);
    const currentPage: number = parseInt(req.params.currentPage);
    search_bottles.GetRelevantBottles(searchQuery != "any" ? searchQuery : "", rescount, currentPage, (bottleList: any, resultCount: number) => {
        res.send([bottleList, resultCount]);
    });
});

app.get('/api/v1/add_to_cellar/:bottleID/:purchaseInfo', (req: any, res: any) => {
    const bottle_id: number = req.params.bottleID;
    const purchaseInfo = JSON.parse(req.params.purchaseInfo);

    RetrieveUserID(req.session.sID, (user_id: number) => {
        AddBottlesToCellar(user_id, bottle_id, purchaseInfo);
        res.send(true);
    });

});

app.get('/api/v1/get_cellar_content/', (req: any, res: any) => {
    RetrieveUserID(req.session.sID, (userID: number) => {
        GetCellarContent(userID, (cellar_content: any) => {
            res.send(cellar_content);
        });
    });
});

app.get('/api/v1/get_wishlist_content/', (req: any, res: any) => {
    RetrieveUserID(req.session.sID, (userID: number) => {
        GetWishlistContent(userID, (wishlist_content: any) => {
            res.send(wishlist_content);
        });
    });
});

app.get(`/api/v1/add_to_wishlist/:bottleID`, (req: any, res: any) => {
    const bottle_id: number = req.params.bottleID;
    RetrieveUserID(req.session.sID, (user_id: number) => {
        AddToWishlist(user_id, bottle_id);
        res.redirect('/wishlist/');
    });
});

app.get(`/api/v1/remove_from_wishlist/:bottleID`, (req: any, res: any) => {
    const bottle_id: number = req.params.bottleID;
    RetrieveUserID(req.session.sID, (user_id: number) => {
        RemoveFromWishlist(user_id, bottle_id);
        res.redirect('/wishlist/');
    });
});

app.get('/api/v1/get_most_profitable_auction_house/:modelID', (req: any, res: any) => {
    const modelID: number = req.params.modelID;
    GetMostProfitableAuctionHousePerBottle(modelID).then((r: any) => {
        res.send([r]);
    });
    //res.send("test");
});


// Start the development server
app.listen(port, "0.0.0.0", () => {
    console.log("Development server started on port: " + port);
});