require('dotenv').config();
const app = require('./src/app')
const connectDB = require("./src/db/db")
const crypto = require("crypto");
global.crypto = crypto;

connectDB();

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> {
    console.log(`server is running on port ${PORT}`)
});