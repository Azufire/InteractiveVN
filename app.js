const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
app.get("/", (req, res) => res.sendFile(__dirname + '/index.html'));

const server = app.listen(port, () => console.log(`App listening on port ${port}!`));
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;