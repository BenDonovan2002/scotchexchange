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
const fs = require("fs");
const mysql = require("mysql");
const info_mysql = require("../../../data_store");
const string_strip_html_1 = require("string-strip-html");
/**
 * Iterate through all of the auction listings and return the bottle models
 * in a list
 * @returns A list of bottle models
 */
function ReadAllAuctions() {
    let bottles = [];
    // Read all the auction files in src/tools/scraping/scotch_whisky_auctions/out/bottles
    // and log the auction data to the console
    const auctionFiles = fs.readdirSync('src/tools/scraping/whiskey_hammer/out/bottles/');
    for (const auctionFile of auctionFiles) {
        const auction = JSON.parse(fs.readFileSync(`src/tools/scraping/whiskey_hammer/out/bottles/${auctionFile}`, 'utf8'));
        bottles.push(...auction);
    }
    return bottles;
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
}
function GetBottleSize(bottleInfo) {
    // find number in string when followed by a unit of volume (ml, cl, l, oz, pt, qt, gal). could be multiple digits and could have a space before the unit. might also be a whole number followed by a fraction
    let titleSize = bottleInfo.pageTitle.toLowerCase().match(/(\d+\.?\d*) ?(\d+\/\d)? ?(ml|cl|l|oz|fl oz)/);
    let descriptionSize = bottleInfo.pageDescription.toLowerCase().match(/(\d+\.?\d*) ?(\d+\/\d)? ?(ml|cl|l|oz|fl oz)/);
    if (titleSize != null) {
        return Math.round(ConvertToCl(titleSize[0]));
    }
    else if (descriptionSize != null) {
        return Math.round(ConvertToCl(descriptionSize[0]));
    }
    return null;
}
/**
* Get the bottle's age from the bottle page
* @param bottleInfo The bottle information
* @returns The bottle's age
*/
function GetBottleAge(bottleInfo) {
    //let age = bottleInfo.pageTitle.match(/(\d+) Year Old/)[1];
    // find number in string when followed by Year Old or Years Old
    let titleAge = bottleInfo.pageTitle.match(/(\d+) Year[s]? Old/);
    let descriptionAge = bottleInfo.pageDescription.match(/(\d+) Year[s]? Old/);
    if (titleAge != null) {
        return titleAge[1];
    }
    else if (descriptionAge != null) {
        return descriptionAge[1];
    }
    return null;
}
function GetWinningBid(bottleInfo) {
    // find number in string which follows a £ sign. could be a decimal number and might have a space before the £ sign but might not
    let winningBid = bottleInfo.winingBid.match(/£(\d+\.?\d*)/);
    if (winningBid != null) {
        return winningBid[1];
    }
    return -1;
}
/**
* Get the bottle's ABV from the bottle page
* @param bottleInfo The bottle information
* @returns The ABV of the bottle
*/
function GetBottleABV(bottleInfo) {
    // find any number followed by a % sign. could be a decimal number and might have a space before the % but might not
    let abvTitle = bottleInfo.pageTitle.match(/(\d+\.?\d*) ?%/);
    let abvDescription = bottleInfo.pageDescription.match(/(\d+\.?\d*) ?%/);
    /*let abvTitle = bottleInfo.pageDescription.match(/(\d+\.?\d*)%/);
    let abvDescription = bottleInfo.pageDescription.match(/(\d+\.?\d*)%/);*/
    if (abvTitle != null) {
        return abvTitle[1];
    }
    else if (abvDescription != null) {
        return abvDescription[1];
    }
    // check the string for a number followed by proof. Could be a space before the word proof but might not. The number also might
    // have a ° symbol after it but might not
    let proofTitle = bottleInfo.pageTitle.toLowerCase().match(/(\d+\.?\d*) ?°? ?proof/);
    let proofDescription = bottleInfo.pageDescription.toLowerCase().match(/(\d+\.?\d*) ?°? ?proof/);
    if (proofTitle != null) {
        return (proofTitle[1] / 2).toString();
    }
    else if (proofDescription != null) {
        return (proofDescription[1] / 2).toString();
    }
    return null;
}
function AddBottleToDatabase(connection, bottleInfo) {
    return new Promise((resolve, reject) => {
        try {
            let sql = "INSERT INTO bottle_sales (model_id, price, auction_month, auction_year, website_url ) VALUES (?, ?, ?, ?, ?)";
            connection.query(sql, [bottleInfo.modelID, bottleInfo.winningBid, bottleInfo.auctionMonth, bottleInfo.auctionYear, "https://www.whiskyhammer.com"], function (err, result) {
                if (err)
                    throw err;
                resolve(null);
            });
        }
        catch (error) {
            console.log(error);
            resolve(null);
        }
    });
}
/*function CheckIfStringIsNumber(string: string) {
  return !isNaN(Number(string));
}

function FillLikeTermArray(likeTerms: Array<string>, fillCount: number) {
  let newLikeArray = [];

  for (let i = 0; i < likeTerms.length; i++) {
    for (let j = 0; j < fillCount; j++) {
      newLikeArray.push(likeTerms[i]);
    }
  }

  return newLikeArray;
}

function CheckArrayContainsSameValues(array: Array<string>) {
  let firstValue = array[0];

  for (let i = 1; i < array.length; i++) {
    if (array[i] != firstValue) {
      return false;
    }
  }

  return true;
}

let stopWords = ["a's", "able", "about", "above", "according", "accordingly", "across", "actually", "after", "afterwards", "again", "against", "ain't", "all", "allow", "allows", "almost", "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "an", "and", "another", "any", "anybody", "anyhow", "anyone", "anything", "anyway", "anyways", "anywhere", "apart", "appear", "appreciate", "appropriate", "are", "aren't", "around", "as", "aside", "ask", "asking", "associated", "at", "available", "away", "awfully", "be", "became", "because", "become", "becomes", "becoming", "been", "before", "beforehand", "behind", "being", "believe", "below", "beside", "besides", "best", "better", "between", "beyond", "both", "brief", "but", "by", "c'mon", "c's", "came", "can", "can't", "cannot", "cant", "cause", "causes", "certain", "certainly", "changes", "clearly", "co", "com", "come", "comes", "concerning", "consequently", "consider", "considering", "contain", "containing", "contains", "corresponding", "could", "couldn't", "course", "currently", "definitely", "described", "despite", "did", "didn't", "different", "do", "does", "doesn't", "doing", "don't", "done", "down", "downwards", "during", "each", "edu", "eg", "eight", "either", "else", "elsewhere", "enough", "entirely", "especially", "et", "etc", "even", "ever", "every", "everybody", "everyone", "everything", "everywhere", "ex", "exactly", "example", "except", "far", "few", "fifth", "first", "five", "followed", "following", "follows", "for", "former", "formerly", "forth", "four", "from", "further", "furthermore", "get", "gets", "getting", "given", "gives", "go", "goes", "going", "gone", "got", "gotten", "greetings", "had", "hadn't", "happens", "hardly", "has", "hasn't", "have", "haven't", "having", "he", "he's", "hello", "help", "hence", "her", "here", "here's", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "hi", "him", "himself", "his", "hither", "hopefully", "how", "howbeit", "however", "i'd", "i'll", "i'm", "i've", "ie", "if", "ignored", "immediate", "in", "inasmuch", "inc", "indeed", "indicate", "indicated", "indicates", "inner", "insofar", "instead", "into", "inward", "is", "isn't", "it", "it'd", "it'll", "it's", "its", "itself", "just", "keep", "keeps", "kept", "know", "knows", "known", "last", "lately", "later", "latter", "latterly", "least", "less", "lest", "let", "let's", "like", "liked", "likely", "little", "look", "looking", "looks", "ltd", "mainly", "many", "may", "maybe", "me", "mean", "meanwhile", "merely", "might", "more", "moreover", "most", "mostly", "much", "must", "my", "myself", "name", "namely", "nd", "near", "nearly", "necessary", "need", "needs", "neither", "never", "nevertheless", "new", "next", "nine", "no", "nobody", "non", "none", "noone", "nor", "normally", "not", "nothing", "novel", "now", "nowhere", "obviously", "of", "off", "often", "oh", "ok", "okay", "old", "on", "once", "one", "ones", "only", "onto", "or", "other", "others", "otherwise", "ought", "our", "ours", "ourselves", "out", "outside", "over", "overall", "own", "particular", "particularly", "per", "perhaps", "placed", "please", "plus", "possible", "presumably", "probably", "provides", "que", "quite", "qv", "rather", "rd", "re", "really", "reasonably", "regarding", "regardless", "regards", "relatively", "respectively", "right", "said", "same", "saw", "say", "saying", "says", "second", "secondly", "see", "seeing", "seem", "seemed", "seeming", "seems", "seen", "self", "selves", "sensible", "sent", "serious", "seriously", "seven", "several", "shall", "she", "should", "shouldn't", "since", "six", "so", "some", "somebody", "somehow", "someone", "something", "sometime", "sometimes", "somewhat", "somewhere", "soon", "sorry", "specified", "specify", "specifying", "still", "sub", "such", "sup", "sure", "t's", "take", "taken", "tell", "tends", "th", "than", "thank", "thanks", "thanx", "that", "that's", "thats", "the", "their", "theirs", "them", "themselves", "then", "thence", "there", "there's", "thereafter", "thereby", "therefore", "therein", "theres", "thereupon", "these", "they", "they'd", "they'll", "they're", "they've", "think", "third", "this", "thorough", "thoroughly", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "took", "toward", "towards", "tried", "tries", "truly", "try", "trying", "twice", "two", "un", "under", "unfortunately", "unless", "unlikely", "until", "unto", "up", "upon", "us", "use", "used", "useful", "uses", "using", "usually", "value", "various", "very", "via", "viz", "vs", "want", "wants", "was", "wasn't", "way", "we", "we'd", "we'll", "we're", "we've", "welcome", "well", "went", "were", "weren't", "what", "what's", "whatever", "when", "whence", "whenever", "where", "where's", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "who's", "whoever", "whole", "whom", "whose", "why", "will", "willing", "wish", "with", "within", "without", "won't", "wonder", "would", "wouldn't", "yes", "yet", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "zero"];

function CheckIfBottleIsForAGroup(bottle: any) {
  let pageTitle: string = bottle.pageTitle.replace("degrees", "°");
  let pageDescription: string = bottle.pageDescription.replace("degrees", "°");

  let group: boolean = false;

  if (pageTitle.match(/\d+\s*x/)) {
    // the title contains a number followed by an x. This could indicate the listing is for a set of bottles
    group = true;
  }

  // Check if the listing contains multiple instances of an ABV
  let abvArray = (() => {
    let returnArray: Array<any> = [];

    let abvTitle = pageTitle.match(/(\d+\.?\d*) ?%/g);
    let proofTitle = pageTitle.toLowerCase().match(/(\d+\.?\d*) ?°? ?proof/g);

    let abvDescription = pageDescription.match(/(\d+\.?\d*) ?%/g);
    let proofDescription = pageDescription.toLowerCase().match(/(\d+\.?\d*) ?°? ?proof/g);

    if (abvTitle != null) {
      returnArray.push(...abvTitle);
    }

    if (proofTitle != null) {
      returnArray.push(...proofTitle);
    }

    if (abvDescription != null) {
      returnArray.push(...abvDescription);
    }

    if (proofDescription != null) {
      returnArray.push(...proofDescription);
    }

    return returnArray;

  })();

  if (!CheckArrayContainsSameValues(abvArray)) {
    // The listing contains multiple ABV values which might signify a group of bottles
    group = true;
  }

  return group;
}

function SearchDatabaseForMatch(searchString: string, searchProperties: any, isBottlePartOfAGroup: boolean) {
  let fullTextMinLength = 2;
  let searchWords = searchString.split(" ");

  let fullTextTerms: Array<string> = [];
  let likeTerms: Array<string> = [];

  searchWords.forEach((word, index) => {
    if (word.length <= fullTextMinLength
      || CheckIfStringIsNumber(word)
      || word.includes("%")
      || word.includes(".")
      || word.includes("#")
      || word.includes("/")
      || stopWords.includes(word.toLowerCase())) {
      likeTerms.push(word);
    } else {
      fullTextTerms.push(word);
    }
  });

  // Create the full text search string with a + at the start of each word
  let fullTextSearchString = fullTextTerms.map((word) => {
    return "+" + word;
  }).join(" ");

  // loop through the like terms and add a % to the start and end of each word. Replace ant % with \% and . with \.
  likeTerms = likeTerms.map((word) => {
    return "%" + word.replace(/%/g, "\\%").replace(/\./g, "\\.") + "%";
  });

  return new Promise((resolve, reject) => {
    // Connect to the database
    let connection = mysql.createConnection(info_mysql.getSQL());

    let sql = "";

    if (likeTerms.length > 0) {
      sql = "SELECT * FROM bottle_models WHERE MATCH (pageTitle, pageDescription) AGAINST (? IN BOOLEAN MODE) AND (";

      likeTerms.forEach((term, index) => {
        if (index == 0) {
          sql += "(pageTitle LIKE ? OR pageDescription LIKE ?)";
        } else {
          sql += " AND (pageTitle LIKE ? OR pageDescription LIKE ?)";
        }
      });

      sql += ")";

      likeTerms = FillLikeTermArray(likeTerms, 2);
    } else {
      sql = "SELECT * FROM bottle_models WHERE MATCH (pageTitle, pageDescription) AGAINST (? IN BOOLEAN MODE)";
    }

    const CheckObjectIsShell = (obj: any) => {
      let shell = true;
      let keys = Object.keys(obj);

      keys.forEach((key) => {
        if (obj[key] != null) {
          shell = false;
        }
      });

      return shell;

    }

    let searchIndices = Object.keys(searchProperties);

    if (searchIndices.length > 0 && !CheckObjectIsShell(searchProperties)) {
      sql += " AND (";

      let indexNumber = 0;

      searchIndices.forEach((index) => {
        if (searchProperties[index] != null) {
          if (indexNumber == 0) {
            sql += `${index} = ?`;
          } else {
            sql += ` AND ${index} = ?`;
          }
          indexNumber++;
        } else {
          delete searchProperties[index];
        }
      });

      sql += ");";
    }

    let c = connection.query(sql, [fullTextSearchString, ...likeTerms, ...Object.values(searchProperties)], function (err: any, result: any) {
      if (err) throw err;
      // filter through the results
      let ObjectArray = JSON.parse(JSON.stringify(result));

      //let isBottlePartOfAGroup = CheckIfBottleIsForAGroup( Obj );

      if ( !isBottlePartOfAGroup ){
        resolve(CurateDatabaseSearch(ObjectArray));
      } else {
        resolve(ObjectArray);
      }
      

      connection.end();
    });
  });

}*/
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
function FormatBottleTitleForDatabase(bottleTitle) {
    // format string to be alphanumeric and but allow spaces, percent signs, slashes, dots, and hashes
    let formattedString = bottleTitle.replace(/[^a-zA-Z0-9\s\%\.\#\/]/g, "");
    // remove any double spaces
    formattedString = formattedString.replace(/  +/g, ' ');
    // remove any double percent signs
    formattedString = formattedString.replace(/%%/g, '%');
    // remove any double slashes
    formattedString = formattedString.replace(/\/\//g, '/');
    // remove any double dots
    formattedString = formattedString.replace(/\.\./g, '.');
    // remove any double hashes
    formattedString = formattedString.replace(/\#\#/g, '#');
    return formattedString;
}
function __main__() {
    return __awaiter(this, void 0, void 0, function* () {
        // create a connection to the database
        let connection = mysql.createConnection(info_mysql.getSQL());
        let bottles = ReadAllAuctions();
        let completedBottles = 900643;
        for (let i = 900643; i < bottles.length; i++) {
            if (bottles[i] != null && bottles[i] != undefined) {
                let bottle = bottles[i];
                let pageTitle = FormatBottleTitleForDatabase(yield (0, string_strip_html_1.stripHtml)(bottle.pageTitle).result);
                let res = yield SearchDatabaseForMatch(connection, pageTitle);
                let months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
                if (res.length > 0) {
                    let auctionMonth = months[parseInt(bottle.date.split("/")[1])];
                    let auctionYear = parseInt(bottle.date.split("/")[2]);
                    let bottleInfo = {
                        pageTitle: pageTitle,
                        modelID: res[0].id,
                        winningBid: bottle.price,
                        pageURL: bottle.url,
                        auctionMonth: auctionMonth,
                        auctionYear: auctionYear,
                        group: res[0].group,
                    };
                    yield AddBottleToDatabase(connection, bottleInfo);
                    completedBottles++;
                    console.log(`Inserted bottle ${completedBottles} / ${bottles.length}`);
                }
                else {
                    console.log("No match found for " + pageTitle);
                }
                if (completedBottles == bottles.length) {
                    yield connection.end();
                }
            }
        }
    });
}
__main__();
