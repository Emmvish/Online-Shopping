const mongoose = require('mongoose')

const dbPort = process.env.MONGODB_PORT || 27017;
const dbHost = process.env.MONGODB_HOST || "mongodb://127.0.0.1"
const dbUrl = dbHost + ":" + dbPort + "/research";

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
})
