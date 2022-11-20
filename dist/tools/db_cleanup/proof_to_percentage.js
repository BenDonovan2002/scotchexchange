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
const mysql = require("mysql2");
const info_mysql = require("../../data_store");
function filterStringToNum(originalString) {
    let allowedCharacters = "0123456789.";
    let filteredString = "";
    for (let i = 0; i < originalString.length; i++) {
        if (allowedCharacters.includes(originalString[i])) {
            filteredString += originalString[i];
        }
    }
    return parseFloat(filteredString);
}
function ConvertProofToPercent(proofRows) {
    let con = mysql.createConnection(info_mysql.getSQL());
    con.connect(function (err) {
        return __awaiter(this, void 0, void 0, function* () {
            if (err) {
                throw err;
            }
            for (let i = 0; i < proofRows.length; i++) {
                let formattedString = (filterStringToNum(proofRows[i]['bottled_strength']) / 2) + "%";
                yield con.promise().query("UPDATE bottle_models SET bottled_strength=? WHERE id=?", [formattedString, proofRows[i]['id']]);
                //console.log( proofRows[i] );
            }
            con.end();
        });
    });
}
function RetrieveProofRows() {
    var con = mysql.createConnection(info_mysql.getSQL());
    con.connect(function (err) {
        if (err) {
            throw err;
        }
        con.query(`SELECT * from bottle_models WHERE bottled_strength LIKE '%proof';`, function (err, res) {
            if (err)
                throw err;
            con.end();
            ConvertProofToPercent(res);
        });
    });
}
RetrieveProofRows();
