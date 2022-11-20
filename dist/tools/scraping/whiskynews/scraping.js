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
const puppeteer = require('puppeteer');
const mysql = require("mysql");
const info_mysql = require("../../../data_store");
function SanitizeHeadline(headline) {
    let sanitizedHeadline = "";
    let allowedCharacters = "abcdefghijklmnopqrstuvwxyz0123456789 !?:;.,-";
    for (let i = 0; i < headline.length; i++) {
        if (allowedCharacters.indexOf(headline[i].toLowerCase()) > -1) {
            sanitizedHeadline += headline[i];
        }
    }
    return sanitizedHeadline;
}
function AddNewsHeadlineToDatabase(headline) {
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection(info_mysql.getSQL());
        connection.connect();
        connection.query('INSERT INTO articles (title) VALUES (?)', [SanitizeHeadline(headline)], function (error, results, fields) {
            if (error)
                throw error;
            console.log("Inserted headline: " + headline);
            resolve(true);
        });
        connection.end();
    });
}
function GetLatestNewsHeadlines() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser = yield puppeteer.launch({
            headless: false,
        });
        let page = yield browser.newPage();
        yield page.goto('https://www.whiskyintelligence.com/');
        yield page.waitForSelector('.post');
        let headlines = yield page.evaluate(() => {
            let headlines = [];
            let elements = document.getElementsByClassName('post');
            for (let i = 0; i < elements.length; i++) {
                let headlineElements = elements[i].getElementsByTagName('h2');
                if (headlineElements.length > 0) {
                    headlines.push(headlineElements[0].innerText);
                }
            }
            return headlines;
        });
        for (let i = 0; i < headlines.length; i++) {
            yield AddNewsHeadlineToDatabase(headlines[i].split("–")[0]);
        }
        yield browser.close();
    });
}
GetLatestNewsHeadlines();
