"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import Node Modules
const mysql = require("mysql");
const mysql_info = require("../data_store");
/**
 * Retrieves all the bottle model information from the database
 * for the relevant model ID. This gets inserted into an object which
 * is then passed to a callback function.
 * @param model_id
 * @param callback
 */
module.exports.GetBottleInfo = function (model_id, callback) {
    var con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        if (err)
            throw err;
        // Get the bottle info for relevant bottles by distillery and age
        con.query(`SELECT * FROM bottle_models WHERE id=?;`, [model_id], function (err, resultSet) {
            if (err) {
                throw err;
            }
            con.end();
            const final_results = resultSet.length > 0 ? {
                "pageTitle": resultSet[0]['pageTitle'],
                "pageDescription": resultSet[0]['pageDescription'],
                "distillery": resultSet[0]['distillery'],
                "age": resultSet[0]['age'],
                "vintage": resultSet[0]['vintage'],
                "region": resultSet[0]['region'],
                "bottler": resultSet[0]['bottler'],
                "cask_type": resultSet[0]['cask_type'],
                "bottled_strength": resultSet[0]['bottled_strength'],
                "bottle_size": resultSet[0]['bottle_size'],
                "distillery_status": resultSet[0]['distillery_status'],
                "image_url": resultSet[0]['image_url'],
            } : null;
            callback(final_results);
        });
    });
};
function FormatPrice(priceString) {
    let allowedChars = "0123456789.";
    let newPrice = "";
    for (let i = 0; i < priceString.length; i++) {
        if (allowedChars.includes(priceString.charAt(i))) {
            newPrice += priceString.charAt(i);
        }
    }
    return newPrice;
}
/**
 * Gets all the instances of the bottles with the releavant model ID in the
 * database, and organises each price by month and year. Finally, it averages these
 * prices and then provides and object of dates and their respective average prices
 * to a callback function.
 * @param model_id The id of the bottle model to retrieve prices for
 * @param callback The callback function to pass the price object to
 */
module.exports.GetAveragesByMonthYear = function (model_id, callback) {
    var con = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err) {
        if (err)
            throw err;
        // Get the bottle info for relevant bottles by distillery and age
        con.query(`SELECT price, auction_month, auction_year FROM bottle_sales WHERE model_id=?;`, [model_id], function (err, resultSet) {
            if (err) {
                throw err;
            }
            // Create an array from the result set to iterate through
            const results = Array.from(resultSet).reverse();
            var formatted_results = [];
            var final_results = {};
            for (var i = 0; i < results.length; i++) {
                const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                if (months.includes(results[i].auction_month.toLowerCase())) {
                    /*
                        Create a string for each month and year we have the data for
                        e.g April 2018
                    */
                    var monthyear = `${results[i].auction_month.charAt(0).toUpperCase() + results[i].auction_month.slice(1)} ${results[i].auction_year}`;
                    // If it isn't already in the array then create an array with the current price in
                    if (formatted_results[monthyear] == undefined) {
                        formatted_results[monthyear] = [parseInt(FormatPrice(results[i].price), 10)];
                    }
                    else {
                        // Else push the next price to the initialised array
                        formatted_results[monthyear].push(parseInt(FormatPrice(results[i].price), 10));
                    }
                }
            }
            // Iterate through the array and get the average price for each month
            for (var key in formatted_results) {
                var temp_values = Array.from(formatted_results[key]);
                // Add it to an object
                final_results[key] = (temp_values.reduce((partialSum, a) => partialSum + a, 0) / temp_values.length).toFixed(2);
            }
            con.end();
            callback(final_results);
        });
    });
};
