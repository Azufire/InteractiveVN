const express = require("express");
const app = express();
const port = process.env.PORT || 3001;

app.get("/", (req, res) => res.type('html').send(html));

const server = app.listen(port, () => console.log(`App listening on port ${port}!`));
const sitePass = "Kawoo123"

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

import html from "../index.html";

function login(username, password)
{
  if (password ===  sitePass){
    alert("TEST");
  } else{
    alert("WRONG");
  }
}