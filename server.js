require('dotenv').config();
const app = require('./src/app')
const connectDB = require("./src/db/db")
const crypto = require("crypto");
global.crypto = crypto;

connectDB();

app.listen(3000, ()=> {
    console.log("server is running")
});