const express = require('express');
const app = express();
const fs = require('fs');

app.get("/api", (req, res) => {
    res.json({"test": "best"});
});

app.get("/menuItems", (req, res) => {
 fs.readFile(__dirname + "/" + "db.json", "utf8", (err, data) => {
   res.send(data);
 });
});

app.listen(3000, () => {
  console.log("app started on http://localhost:3000")
});