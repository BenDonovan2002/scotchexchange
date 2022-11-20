"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignInUser = void 0;
// Import types
const crypto_1 = require("crypto");
// Import modules
const mysql = require("mysql");
const sql_info = require("../data_store");
/**
 * Return a random string of characters to use as a UUID
 * @returns UUID
 */
function GenerateSecureSID() {
    return (0, crypto_1.randomUUID)();
}
/**
 * Checks to see if the user data entered is equal to what is in the
 * database. If so, then it generated a UUID and redirects the user
 * to the dashboard page whilst specifiying this UUID.
 * @param username The entered username
 * @param password The entered password
 * @param redirectUser The callback function used to redirect the user
 */
function SignInUser(username, password, redirectUser) {
    var con = mysql.createConnection(sql_info.getSQL());
    con.connect(function (err) {
        if (err)
            throw err;
        con.query(`SELECT id, password FROM users WHERE username=? OR email=?;`, [username, username], function (err, resultSet) {
            if (err) {
                throw err;
            }
            const result = Array.from(resultSet).length > 0 ? Array.from(resultSet)[0] : null;
            if (result == null || result.password != password) {
                // Redirect to incorrect details page
                con.end();
                if (redirectUser != undefined) {
                    redirectUser(null);
                }
            }
            else {
                const UUID = GenerateSecureSID();
                con.query("UPDATE users SET sessionID=? WHERE id=?;", [UUID, result.id], function (err) {
                    if (err) {
                        throw err;
                    }
                    con.end();
                    if (redirectUser != undefined) {
                        redirectUser(UUID);
                    }
                });
            }
        });
    });
}
exports.SignInUser = SignInUser;
