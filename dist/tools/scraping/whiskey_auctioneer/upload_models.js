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
const fs = require('fs');
const mysql = require('mysql');
const mysql_info = require("../../../data_store");
// @ts-ignore
const stripTags = function (string) {
    return string.replace(/<\/?[^>]+>/gi, '');
};
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
function CheckBottleIsUnique(connection, bottleTitle) {
    return new Promise((resolve, reject) => {
        SearchDatabaseForMatch(connection, bottleTitle).then((result) => {
            if (result.length > 0) {
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}
function UploadBottleModelToDB(bottleInfo) {
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection(mysql_info.getSQL());
        connection.connect();
        CheckBottleIsUnique(connection, bottleInfo.pageTitle).then((isUnique) => {
            if (isUnique) {
                let sql = "INSERT INTO bottle_models (pageTitle, pageDescription, distillery, age, bottled_strength, bottle_size, image_url, website_url ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                connection.query(sql, [
                    bottleInfo.pageTitle,
                    bottleInfo.description,
                    bottleInfo.distillery,
                    bottleInfo.age,
                    bottleInfo.bottled_strength,
                    bottleInfo.bottle_size,
                    bottleInfo.image_url,
                    bottleInfo.website_url
                ], function (error, results, fields) {
                    if (error)
                        throw error;
                    connection.end();
                    resolve(1);
                    // Neat!
                });
            }
            else {
                connection.end();
                resolve(0);
            }
        });
    });
}
/**
 * Iterate through all of the fields in the bottle and assign them to the correct property.
 * @param fieldsObject The fields object to parse.
 * @returns A parsed object with all of the fields.
 */
function ParseBottleFields(fieldsObject) {
    let fields = {
        distillery: null,
        age: null,
        vintage: null,
        region: null,
        bottled_strength: null,
        bottle_size: null,
        description: null,
    };
    for (let i = 0; i < fieldsObject.length; i++) {
        let field = fieldsObject[i];
        field = field.replace("&nbsp;", "");
        let strippedField = stripTags(field);
        if (i == fieldsObject.length - 1) {
            // Description is the last field
            fields.description = strippedField;
        }
        else {
            if (strippedField.includes(":")) {
                // Split the field into a key and value
                let splitField = strippedField.split(":");
                let key = splitField[0].toLowerCase().replace(" ", "_");
                if (key in fields) {
                    fields[key] = splitField[1];
                }
            }
        }
    }
    return fields;
}
/**
 * Reads the contents of all the files in the given directory.
 */
function ReadBottleInformationFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        let files = fs.readdirSync('src/tools/scraping/whiskey_auctioneer/out/bottles');
        for (let i = 0; i < files.length; i++) {
            console.log(`Beginning Auction: ${i}/${files.length}`);
            let file = files[i];
            // Read the file
            const bottleInformationCollection = JSON.parse(fs.readFileSync('src/tools/scraping/whiskey_auctioneer/out/bottles/' + file, 'utf8'));
            for (let j = 0; j < bottleInformationCollection.length; j++) {
                console.log(`Beginning Bottle: ${j}/${bottleInformationCollection.length}`);
                let bottleInformation = bottleInformationCollection[j];
                let parsedFields = ParseBottleFields(bottleInformation.fields);
                parsedFields["pageTitle"] = bottleInformation.pageTitle;
                parsedFields["image_url"] = bottleInformation.imgURL;
                parsedFields["website_url"] = bottleInformation.bottleURL;
                yield UploadBottleModelToDB(parsedFields);
            }
        }
    });
}
ReadBottleInformationFiles();
