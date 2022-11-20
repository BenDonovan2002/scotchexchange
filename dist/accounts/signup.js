"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The function takes in the user information and inserts it into the database.
 * It first validates all the information to make sure it is legal
 */
module.exports.SignUpUser = function (username, firstname, lastname, email, password) {
    var mysql = require("mysql");
    var sql_info = require("../data_store");
    var validator = require("email-validator");
    // Validate user info
    if (username.length <= 0 ||
        firstname.length <= 0 ||
        lastname.length <= 0 ||
        email.length <= 0 ||
        validator.validate(email) == false ||
        password.length <= 0) {
        return false;
    }
    // Create the connection to the database
    var con = mysql.createConnection(sql_info.getSQL());
    con.connect(function (err) {
        if (err)
            throw err;
        con.query('SELECT id, password FROM users WHERE username=? OR email=?;', [username, email], function (err, resultSet) {
            if (Array.from(resultSet).length > 0) {
                // Username or Email already exists!
                con.end();
            }
            else {
                con.query("INSERT INTO users ( username, firstname, lastname, email, password ) VALUES ( ?,?,?,?,? ) ", [username, firstname, lastname, email, password], function (err, result) {
                    if (err)
                        throw err;
                    con.end();
                });
            }
        });
    });
    return true;
};
