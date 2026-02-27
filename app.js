import mysql from 'mysql2';
import express from 'express';
import Module from "node:module";
const require = Module.createRequire(import.meta.url);
const {body, matchedData, validationResult} = require('express-validator');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const __dirname = import.meta.dirname;
const port = process.env.PORT || 3001;
const app = express();
const barMax = Number(process.env.BAR_MAX);
//setup express render settings
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

//formatting middleware
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/imgs', express.static(__dirname  + '/imgs'));
app.use(cookieParser(process.env.COOKIE));

//setting up arrays for referencing answer values
const typeNames = ["BAD", "OK", "GOOD"];
const typeVals = [process.env.VAL_BAD, process.env.VAL_OK, process.env.VAL_GOOD];

//function to hash given sting (password) with SHA-256
async function hashString(inputString) {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString); 
    const hashBuffer = await crypto.subtle.digest('SHA-256', data); 
    const hashArray = Array.from(new Uint8Array(hashBuffer)); 
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join(''); 
    return hashHex;
}

//function to get current bar value: queries db, returns percentage value
async function getBar() {
    const currentVal = (await pool.query("SELECT total FROM History ORDER BY change_id DESC LIMIT 1;"))[0][0].total;
    const percentage = Math.max(0, (currentVal / barMax) * 100);
    return percentage;
};

//route called by bar to update percentage
app.get("/get-bar", async (req, res) => {
    const percentage = await getBar();
    res.json({ percentage: percentage });
});

//route to render in bar with percentage variable
app.get('/bar', async (req, res) => {
    const percentage = await getBar();
    return res.render("bar", {fillVal: percentage});
});

//Parse login attempts - sanatize/validate inputs, hash/compare password hashes; create cookie->redirect if true, errormsg and return if false
app.post("/in", body("username").trim().notEmpty().escape(),
                body("password").trim().notEmpty().escape(), async (req, res) => {
    const errors = validationResult(req);
    var errmsg = "";
    if(errors.isEmpty()) {
        const testPass = await hashString(matchedData(req).password);
        if(testPass === NotPassword) {
            res.cookie('username',matchedData(req).username, {httpOnly:true, signed: true});
            return res.redirect('/main');
        } else {
            errmsg = "Password incorrect!";
        }
    } else {
        var results = errors.array();
        errmsg = "Invalid ";
        if (results.length == 2){
            errmsg += "username and password"
        } else (results[0].path === "username" ? errmsg += "username" : errmsg += "password");
    }
    return res.render("login", {msg: errmsg});
});

//redirect for main controls page: check for cookie -> query for table -> render view
app.get('/main', async (req, res) => {
    const cookie = req.signedCookies.username;
    if (cookie == null){
        return res.redirect('/');
    }
    const historyLog = await pool.query("SELECT * from History ORDER BY change_id DESC;");
    return res.render("main", {user: cookie, tableData: historyLog[0]});
});

//parse post requests for new answers: send to sql database, update StreamElements bar
app.post("/main", async (req, res) => {
    var errmsg = "";
    var typeCode = req.body.changeType;
    if (typeCode == -1) {
        errmsg = "Please select a value from the dropdown!";
    } else {
        const changeType = typeNames[typeCode];
        const changeVal = typeVals[typeCode];
        try {
            const currTotal = await pool.query("SELECT total FROM History ORDER BY change_id DESC LIMIT 1;");
            await pool.query
            ("INSERT INTO History (username, change_type, total) VALUES (?, ?, ?)",
                [req.signedCookies.username, changeType, changeVal + currTotal]
            );
            //the stream elements bar updating code would go here, i imagine
        } catch (e) {
            errmsg = "Something went wrong while connecting to the database...";
            console.log(e);
        }
    }
    const historyLog = await pool.query("SELECT * from History ORDER BY change_id DESC;");
    return res.render("main", 
        {user: req.signedCookies.username, tableData: historyLog[0], msg: errmsg});
})

//parse post requests to manually set bar value (bottom option): send data to sql database, update bar
app.post("/set", body("total").trim().notEmpty().isNumeric().escape(), async (req, res) => {
    var errmsg = "";
    const errors = validationResult(req);
    const changeVal = matchedData(req).total;
    if (req.body.changeType != 4){
        errmsg = "Select SET in the dropdown to confirm your change!";
    } else if (errors.isEmpty() && changeVal >= 0){
        try {
            await pool.query
            ("INSERT INTO History (username, change_type, total) VALUES (?, ?, ?)",
                [req.signedCookies.username, "SET", changeVal]
            );
            errmsg = "Bar value has been manually set.";
            //the stream elements bar updating code would go here, i imagine
        } catch (e) {
            errmsg = "Something went wrong while connecting to the database...";
            console.log(e);
        }
        } else {
            errmsg = "Please use non-negative values only!";
    }
    const historyLog = await pool.query("SELECT * from History ORDER BY change_id DESC;");
    return res.render("main", 
        {user: req.signedCookies.username, tableData: historyLog[0], msg: errmsg});
})

//deploy express app with login html
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