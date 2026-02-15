import mysql from 'mysql2';
import express from 'express';
import Module from "node:module";
const require = Module.createRequire(import.meta.url);
const {body, matchedData, validationResult} = require('express-validator');
const __dirname = import.meta.dirname;
const app = express();
const port = process.env.PORT || 3001;
var NotPassword = process.env.SITEPASS;

//function to hash given sting (password) with SHA-256
    async function hashString(inputString) {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString); 
    const hashBuffer = await crypto.subtle.digest('SHA-256', data); 

    const hashArray = Array.from(new Uint8Array(hashBuffer)); 
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join(''); 
    return hashHex;
    }

//Parse login attempts - sanatize/validate inputs, hash and compare to password hash; allow entry if successful, error if false
app.post("./", (req, res) => {
    console.log(req);
    const result = validationResult(req);
    console.log("login request recieved");
    if(result.isEmpty()) {
        const testPass = matchedData(req);
        if(testPass === NotPassword) {
            return res.sendFile(__dirname + '/main.html');
        } else {
            return res.end("Password does not match!");
        }
    }
    res.send({errors: result.array()});
    return res.redirect('/');
});

//deploy express app with main page html
app.get("/", (req, res) => res.sendFile(__dirname + '/index.html'));
const server = app.listen(port, () => console.log(`App listening on port ${port}!`));
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

//create connection pool for MySQL database at AWS
const pool = mysql.createPool({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME
}).promise();

//hash env variable SITEPASS, set database value, run on deployment startup to ensure pass is updated
async function setPass() {
    var pass = await hashString(process.env.SITEPASS);
    const passQuery = "UPDATE CODE SET pass='".concat(pass, "'");
    const result = await pool.query(passQuery);
    return pass;
}
NotPassword = await setPass();