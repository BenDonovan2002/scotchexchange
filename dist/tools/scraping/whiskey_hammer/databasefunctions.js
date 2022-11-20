"use strict";
const fs = require("fs");
const mysql = require("mysql");
const info_mysql = require("../../../data_store");
/**
 * Iterates through all of the files in /out/ and retrieves the bottle data.
 * @returns An array of bottle data
 */
function RetrieveBottleModelsFromFile() {
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
 * Creates a bottle model from bottle data
 * @param bottle The data of the bottle to create a model for
 * @returns The bottle model
 */
function CreateBottleModel(bottle) {
    if (bottle == null
        || (bottle.vintage == null && bottle.age == undefined)) {
        return null;
    }
    let bottleModel = {
        distillery: bottle.distillery,
        age: bottle.age,
        vintage: bottle.vintage,
        region: bottle.region,
        bottler: bottle.bottler,
        cask_type: bottle.cask_type,
        bottled_strength: bottle.strength,
        bottle_size: bottle.size,
        distillery_status: bottle.distillery_status,
        image_url: bottle.imageURI
    };
    return bottleModel;
}
/**
 * Iterates through an array of bottle data and creates bottle models for
 * that data
 * @param bottleData Array of bottle data to create models from
 * @returns An array of bottle models to insert into the database
 */
function CreateBottleModelsFromBottleData(bottleData) {
    let bottleModels = [];
    for (let i = 0; i < bottleData.length; i++) {
        let bottle = bottleData[i];
        let bottleModel = CreateBottleModel(bottle);
        if (bottleModel != null) {
            bottleModels.push(bottleModel);
        }
    }
    return bottleModels;
}
// a function which checks to see if a row exists in the database which matches the bottle model
async function CheckIfBottleExists(bottleModel) {
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection(info_mysql.getSQL());
        connection.connect((err) => {
            if (err) {
                reject(err);
            }
        });
        let query = `SELECT * FROM bottle_models WHERE distillery = ? AND bottled_strength = ? AND bottle_size = ?`;
        if (bottleModel.age != null && bottleModel.age != undefined) {
            query += ` AND age = '${bottleModel.age}'`;
        }
        if (bottleModel.vintage != null && bottleModel.vintage != undefined) {
            query += ` AND vintage = '${bottleModel.vintage}'`;
        }
        query += ";";
        connection.query(query, [bottleModel.distillery, bottleModel.bottled_strength, bottleModel.bottle_size], (err, results) => {
            if (err) {
                reject(err);
            }
            else {
                if (results.length > 0) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            }
        });
        connection.end();
    });
}
// a function which inserts a bottle model into the MySQL table named bottle_models
async function InsertBottleModel(bottleModel) {
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection(info_mysql.getSQL());
        connection.connect((err) => {
            if (err) {
                reject(err);
            }
        });
        let query = `INSERT INTO bottle_models (distillery, age, vintage, region, bottler, cask_type, bottled_strength, bottle_size, distillery_status, image_url)
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );`;
        connection.query(query, [bottleModel.distillery, bottleModel.age, bottleModel.vintage, bottleModel.region, bottleModel.bottler, bottleModel.cask_type, bottleModel.bottled_strength, bottleModel.bottle_size, bottleModel.distillery_status, bottleModel.image_url], (err, results) => {
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
// The main entry point for the program
async function __run__() {
    let bottleData = RetrieveBottleModelsFromFile();
    let bottleModels = CreateBottleModelsFromBottleData(bottleData);
    /*for ( let i = 0; i < bottleModels.length; i++ ){
        
    }*/
    /*CheckIfBottleExists( bottleModels[1] ).then((exists: any) => {
        if ( !exists ){
            InsertBottleModel( bottleModels[1] ).then((results: any) => {
                console.log( results );
            } ).catch( (err: any) => {
                console.log( err );
            } );
        }
    } ).catch( ( err: any ) => {
        console.log(err);
    } );*/
    for (let i = 0; i < bottleModels.length; i++) {
        console.log(`Inserting Bottle Model: ${i}/${bottleModels.length}`);
        let exists = await CheckIfBottleExists(bottleModels[i]);
        if (!exists) {
            let results = await InsertBottleModel(bottleModels[i]);
            console.log(results);
        }
        else {
            console.log("exists");
        }
    }
}
__run__();
