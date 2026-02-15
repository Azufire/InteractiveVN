import mysql from 'mysql2';
import express from 'express';
import Module from "node:module";
const require = Module.createRequire(import.meta.url);
const {body, matchedData, validationResult} = require('express-validator');
require('dotenv').config();
const __dirname = import.meta.dirname;
const app = express();
const port = process.env.PORT || 3001;
//setup express render settings
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

//formatting middleware
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static('public'));

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
app.post("/in", body("username").trim().notEmpty().escape(),
                body("password").trim().notEmpty().escape(), async (req, res) => {
    const result = validationResult(req);
    var errmsg = "";
    if(result.isEmpty()) {
        const testPass = await hashString(matchedData(req).password);
        if(testPass === NotPassword) {
            const historyLog = await pool.query("SELECT * from History ORDER BY change_id DESC;");
            return res.render("main", {user: matchedData(req).username, tableData: historyLog });
        } else {
            errmsg = "Password incorrect!";
        }
    } else {
        for(const item of result.array()){
            if(item.path === "username"){
                errmsg += "invalid username ";
            } else if (item.path === "password") {
                errmsg += "invalid password";
            }
        }
    }
    return res.render("login", {msg: errmsg});
});

//deploy express app with main page html
app.get("/", (req, res) => res.render("login"));
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

//hashes sitepass value, stores as string on server
const NotPassword = await hashString(process.env.SITEPASS);