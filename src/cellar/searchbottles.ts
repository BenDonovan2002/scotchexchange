// Import MySQL Types
import { Connection, MysqlError } from "mysql";

// Import Node Modules
const mysql = require("mysql");
const mysql_info = require("../data_store");

/**
 * Searches the database for entries which contain columns
 * ( distillery, age, bottled_strength, bottle_size ) with values
 * similar to the ones provided. The response gets converted into an
 * array of bottle objects which then gets passed to a callback function. 
 * @param distillery Distillery to search for
 * @param age Age to search for
 * @param abv Bottled_Strength to search for
 * @param vol Bottle_Volume to search for
 * @param rescount Number of results to return
 * @param callback The function to pass the list of bottles to
 */
module.exports.GetRelevantBottles_LEGACY = function (distillery: string, age: string, abv: string, vol: string, rescount: number, currentPage: number, callback: CallableFunction) {

    var con: Connection = mysql.createConnection(mysql_info.getSQL());
    con.connect(function (err: MysqlError) {
        if (err) throw err;

        // Get the bottle info for relevant bottles by distillery and age
        con.query(`SELECT * FROM bottle_models WHERE distillery LIKE ? AND age LIKE ? AND bottle_size LIKE ? AND bottled_strength LIKE ?;`,
            [`%${distillery}%`, `%${age}%`, `%${vol}%`, `%${abv}%`],
            function (err: MysqlError | null, resultSet) {

                if (err) { throw err; }

                // Create an array from the result set to iterate through
                const results: any = Array.from(resultSet);
                con.end();

                if (currentPage * rescount > results.length) {
                    callback(results.slice((currentPage) * rescount, results.length), results.length);
                } else {
                    callback(results.slice((currentPage) * rescount, (currentPage + 1) * rescount), results.length);
                }

                //callback( results.length > rescount ? results.slice(0, rescount) : results, results.length );
            }
        );
    });

};

let stopWords = ["a's", "able", "about", "above", "according", "accordingly", "across", "actually", "after", "afterwards", "again", "against", "ain't", "all", "allow", "allows", "almost", "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "an", "and", "another", "any", "anybody", "anyhow", "anyone", "anything", "anyway", "anyways", "anywhere", "apart", "appear", "appreciate", "appropriate", "are", "aren't", "around", "as", "aside", "ask", "asking", "associated", "at", "available", "away", "awfully", "be", "became", "because", "become", "becomes", "becoming", "been", "before", "beforehand", "behind", "being", "believe", "below", "beside", "besides", "best", "better", "between", "beyond", "both", "brief", "but", "by", "c'mon", "c's", "came", "can", "can't", "cannot", "cant", "cause", "causes", "certain", "certainly", "changes", "clearly", "co", "com", "come", "comes", "concerning", "consequently", "consider", "considering", "contain", "containing", "contains", "corresponding", "could", "couldn't", "course", "currently", "definitely", "described", "despite", "did", "didn't", "different", "do", "does", "doesn't", "doing", "don't", "done", "down", "downwards", "during", "each", "edu", "eg", "eight", "either", "else", "elsewhere", "enough", "entirely", "especially", "et", "etc", "even", "ever", "every", "everybody", "everyone", "everything", "everywhere", "ex", "exactly", "example", "except", "far", "few", "fifth", "first", "five", "followed", "following", "follows", "for", "former", "formerly", "forth", "four", "from", "further", "furthermore", "get", "gets", "getting", "given", "gives", "go", "goes", "going", "gone", "got", "gotten", "greetings", "had", "hadn't", "happens", "hardly", "has", "hasn't", "have", "haven't", "having", "he", "he's", "hello", "help", "hence", "her", "here", "here's", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "hi", "him", "himself", "his", "hither", "hopefully", "how", "howbeit", "however", "i'd", "i'll", "i'm", "i've", "ie", "if", "ignored", "immediate", "in", "inasmuch", "inc", "indeed", "indicate", "indicated", "indicates", "inner", "insofar", "instead", "into", "inward", "is", "isn't", "it", "it'd", "it'll", "it's", "its", "itself", "just", "keep", "keeps", "kept", "know", "knows", "known", "last", "lately", "later", "latter", "latterly", "least", "less", "lest", "let", "let's", "like", "liked", "likely", "little", "look", "looking", "looks", "ltd", "mainly", "many", "may", "maybe", "me", "mean", "meanwhile", "merely", "might", "more", "moreover", "most", "mostly", "much", "must", "my", "myself", "name", "namely", "nd", "near", "nearly", "necessary", "need", "needs", "neither", "never", "nevertheless", "new", "next", "nine", "no", "nobody", "non", "none", "noone", "nor", "normally", "not", "nothing", "novel", "now", "nowhere", "obviously", "of", "off", "often", "oh", "ok", "okay", "old", "on", "once", "one", "ones", "only", "onto", "or", "other", "others", "otherwise", "ought", "our", "ours", "ourselves", "out", "outside", "over", "overall", "own", "particular", "particularly", "per", "perhaps", "placed", "please", "plus", "possible", "presumably", "probably", "provides", "que", "quite", "qv", "rather", "rd", "re", "really", "reasonably", "regarding", "regardless", "regards", "relatively", "respectively", "right", "said", "same", "saw", "say", "saying", "says", "second", "secondly", "see", "seeing", "seem", "seemed", "seeming", "seems", "seen", "self", "selves", "sensible", "sent", "serious", "seriously", "seven", "several", "shall", "she", "should", "shouldn't", "since", "six", "so", "some", "somebody", "somehow", "someone", "something", "sometime", "sometimes", "somewhat", "somewhere", "soon", "sorry", "specified", "specify", "specifying", "still", "sub", "such", "sup", "sure", "t's", "take", "taken", "tell", "tends", "th", "than", "thank", "thanks", "thanx", "that", "that's", "thats", "the", "their", "theirs", "them", "themselves", "then", "thence", "there", "there's", "thereafter", "thereby", "therefore", "therein", "theres", "thereupon", "these", "they", "they'd", "they'll", "they're", "they've", "think", "third", "this", "thorough", "thoroughly", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "took", "toward", "towards", "tried", "tries", "truly", "try", "trying", "twice", "two", "un", "under", "unfortunately", "unless", "unlikely", "until", "unto", "up", "upon", "us", "use", "used", "useful", "uses", "using", "usually", "value", "various", "very", "via", "viz", "vs", "want", "wants", "was", "wasn't", "way", "we", "we'd", "we'll", "we're", "we've", "welcome", "well", "went", "were", "weren't", "what", "what's", "whatever", "when", "whence", "whenever", "where", "where's", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "who's", "whoever", "whole", "whom", "whose", "why", "will", "willing", "wish", "with", "within", "without", "won't", "wonder", "would", "wouldn't", "yes", "yet", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "zero"];

function CheckIfStringIsNumber(string: string) {
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

function SearchDatabaseForMatch(searchString: string, searchProperties: any) {
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
        let connection = mysql.createConnection(mysql_info.getSQL());

        let sql = "";

        if (fullTextSearchString != "") {
            sql = "SELECT * FROM bottle_models WHERE MATCH (pageTitle) AGAINST (? IN BOOLEAN MODE) AND ";
        } else {
            sql = "SELECT * FROM bottle_models WHERE ";
        }

        if (likeTerms.length > 0) {
            sql += "(";

            likeTerms.forEach((term, index) => {
                if (index == 0) {
                    sql += "pageTitle LIKE ?";
                } else {
                    sql += " AND pageTitle LIKE ?";
                }
            });

            sql += ")";
        } else {
            sql = "SELECT * FROM bottle_models WHERE MATCH (pageTitle) AGAINST (? IN BOOLEAN MODE)";
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

        let sqlParams: any = [];

        if (fullTextSearchString != "") {
            sqlParams = [fullTextSearchString, ...likeTerms, ...Object.values(searchProperties)];
        } else {
            sqlParams = [...likeTerms, ...Object.values(searchProperties)];
        }

        let c = connection.query(sql, sqlParams, function (err: any, result: any) {
            if (err) throw err;
            // filter through the results
            let ObjectArray = JSON.parse(JSON.stringify(result));

            console.log(c.sql);

            resolve(ObjectArray);

            connection.end();
        });
    });

}

function RetrieveMatchRanking(searchStringWords: Array<string>, searchResultWords: Array<string>) {
    let count = 0;
    let indexedWords: any = [];
    for (let i = 0; i < searchStringWords.length; i++) {
        if (searchResultWords.includes(searchStringWords[i]) && !indexedWords.includes(searchStringWords[i])) {
            count++;
            indexedWords.push(searchStringWords[i]);
        }
    }

    return (count / searchResultWords.length) * 100;
}

function CurateSearchResults(searchString: string, searchResults: Array<any>) {
    let searchStringWords = searchString.split(" ");
    let curatedResults: Array<any> = [];
    for (let i = 0; i < searchResults.length; i++) {
        let searchResultWords = searchResults[i].pageTitle.split(" ");
        curatedResults.push([
            searchResults[i],
            RetrieveMatchRanking(searchStringWords, searchResultWords)
        ]);
    }

    let sortedResults = curatedResults.sort((a, b) => {
        return b[1] - a[1];
    });

    return sortedResults;
}

module.exports.GetRelevantBottles = function (searchQuery: string, rescount: number, currentPage: number, callback: CallableFunction) {
    SearchDatabaseForMatch(searchQuery, {}).then((results: any) => {
        let sortedResultsWithRank = CurateSearchResults(searchQuery, results);

        let sortedResults = sortedResultsWithRank.map((result) => {
            return result[0];
        });

        if (currentPage * rescount > results.length) {
            callback(sortedResults.slice((currentPage) * rescount, sortedResults.length), sortedResults.length);
        } else {
            callback(sortedResults.slice((currentPage) * rescount, (currentPage + 1) * rescount), sortedResults.length);
        }
    });
}

module.exports.GetRelevantBottlesAsync = async function (searchQuery: string, rescount: number, currentPage: number) {
    let results: any = await SearchDatabaseForMatch(searchQuery, {});

    if ( results.length != 0 ){
        let sortedResultsWithRank = CurateSearchResults(searchQuery, results);

        let sortedResults = sortedResultsWithRank.map((result) => {
            return result[0];
        });
    
        if (currentPage * rescount > results.length) {
            return [sortedResults.slice((currentPage) * rescount, sortedResults.length), sortedResults.length];
        } else {
            return [sortedResults.slice((currentPage) * rescount, (currentPage + 1) * rescount), sortedResults.length];
        }
    } else {
        return [null, 0];
    }

}