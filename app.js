import mysql from 'mysql2'
const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
//deploy express app with main page html
app.get("/", (req, res) => res.sendFile(__dirname + '/index.html'));
const server = app.listen(port, () => console.log(`App listening on port ${port}!`));
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

//create connection pool for MySQL database at AWS
const pool = mysql.createPool({
    host: 'interactivevn.cxwwweeoqhzq.us-west-1.rds.amazonaws.com',
    user: 'xpquery',
    password:'letmeinpls',
    database: 'History_Log'
}).promise();

//function to hash given sting (password) with SHA-256
    async function hashString(inputString) {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString); 
    const hashBuffer = await crypto.subtle.digest('SHA-256', data); 

    const hashArray = Array.from(new Uint8Array(hashBuffer)); 
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join(''); 

    return hashHex;
    }

//hash env variable SITEPASS, set database value, run on deployment startup to ensure pass is updated
async function setPass() {
    const passQuery = "UPDATE CODE SET pass='".concat(await hashString(process.env.SITEPASS), "'");
    const result = await pool.query(passQuery);
    console.log(result);
}

setPass();
