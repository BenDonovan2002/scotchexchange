"use strict";
const fs = require("fs");
/**
 * Iterates through all of the bottles which have been scraped in /bottles/ andx
 * inserts the models into the database.
 */
function AddBottleModelToDatabase() {
    // iterate through all of the files in /bottles/ and read them as a string
    let bottleFiles = fs.readdirSync("src/tools/scraping/whiskey_hammer/out/bottles/");
    let bottleArray = [];
    for (let i = 0; i < bottleFiles.length; i++) {
        let bottleFile = bottleFiles[i];
        let bottleString = fs.readFileSync(`src/tools/scraping/whiskey_hammer/out/bottles/${bottleFile}`, "utf8");
        let bottleJSON = JSON.parse(bottleString);
        bottleArray = bottleArray.concat(bottleJSON);
    }
    console.log(bottleArray);
}
