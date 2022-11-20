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
const mysql = require("mysql");
const fs = require("fs");
const info_mysql = require("../../data_store");
function UpdateModelValues(bottle_models, model_values) {
    var con = mysql.createConnection(info_mysql.getSQL());
    con.connect(function (err) {
        if (err) {
            throw err;
        }
        for (var i = 0; i < model_values.length; i++) {
            let bottle_model = bottle_models.filter((obj) => {
                if (obj['distillery'] == model_values[i]['distillery']
                    && obj['age'] == model_values[i]['age']
                    && obj['bottled_strength'] == model_values[i]['bottled_strength']
                    && obj['bottle_size'] == model_values[i]['bottle_size']) {
                    return obj;
                }
            });
            let model_id = bottle_model.length > 0 ? bottle_model[0]["id"] : null;
            con.query("UPDATE model_values SET model_id=? WHERE id=?", [model_id, model_values[i]['id']]);
        }
    });
}
function GetModelValueID(bottle_models) {
    var con = mysql.createConnection(info_mysql.getSQL());
    con.connect(function (err) {
        return __awaiter(this, void 0, void 0, function* () {
            if (err) {
                throw err;
            }
            var bottles = [];
            var bottles_other = [];
            yield con.query("SELECT * from model_values", function (err, result) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        throw err;
                    }
                    /*var final_bottles = bottles.map((e: any, i: any) => (e + bottles_other[i]));
        
                    fs.writeFile('./test.json', JSON.stringify(final_bottles), function (err) {
                        if (err) throw err;
                    });*/
                    con.end();
                    UpdateModelValues(bottle_models, result);
                });
            });
        });
    });
}
function GetModelIDs() {
    var con = mysql.createConnection(info_mysql.getSQL());
    con.connect(function (err) {
        return __awaiter(this, void 0, void 0, function* () {
            if (err) {
                throw err;
            }
            var bottles = [];
            var bottles_other = [];
            yield con.query("SELECT * from bottle_models", function (err, result) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        throw err;
                    }
                    /*var final_bottles = bottles.map((e: any, i: any) => (e + bottles_other[i]));
        
                    fs.writeFile('./test.json', JSON.stringify(final_bottles), function (err) {
                        if (err) throw err;
                    });*/
                    con.end();
                    GetModelValueID(result);
                });
            });
        });
    });
}
function GetUniqueBottles() {
    var con = mysql.createConnection(info_mysql.getSQL());
    con.connect(function (err) {
        return __awaiter(this, void 0, void 0, function* () {
            if (err) {
                throw err;
            }
            var bottles = [];
            var bottles_other = [];
            yield con.query("SELECT * from bottles", function (err, result) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        throw err;
                    }
                    for (var i = 0; i < result.length; i++) {
                        let bottle_string = result[i]['distillery'] + "~" +
                            result[i]['age'] + "~" +
                            result[i]['bottled_strength'] + "~" +
                            result[i]['bottle_size'] + "~";
                        if (bottles.includes(bottle_string) == false) {
                            bottles.push(bottle_string);
                            bottles_other.push(result[i]['vintage'] + "~" +
                                result[i]['region'] + "~" +
                                result[i]['bottler'] + "~" +
                                result[i]['cask_type'] + "~" +
                                result[i]['distillery_status'] + "~" +
                                result[i]['image_url']);
                        }
                    }
                    var final_bottles = bottles.map((e, i) => (e + bottles_other[i]));
                    fs.writeFile('./test.json', JSON.stringify(final_bottles), function (err) {
                        if (err)
                            throw err;
                    });
                    con.end();
                });
            });
        });
    });
}
function InsertBottleModels(index) {
    var f = JSON.parse(fs.readFileSync("./test.json", 'utf-8'));
    var con = mysql.createConnection(info_mysql.getSQL());
    let bottle_info = f[index].split("~");
    con.connect(function (err) {
        if (err) {
            throw err;
        }
        con.query(`INSERT INTO \`bottle_models\` ( distillery, age, bottled_strength, bottle_size, vintage, region, bottler, cask_type, distillery_status, image_url )
            VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`, [
            bottle_info[0],
            bottle_info[1],
            bottle_info[2],
            bottle_info[3],
            bottle_info[4],
            bottle_info[5],
            bottle_info[6],
            bottle_info[7],
            bottle_info[8],
            bottle_info[9]
        ], function (err) {
            if (err)
                throw err;
            con.end();
            if (index < f.length) {
                var newin = index += 1;
                InsertBottleModels(newin);
            }
        });
    });
}
GetModelIDs();
//UpdateModelValues();
