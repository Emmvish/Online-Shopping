const express = require('express')

require('./db/mongoose')
const userRouter = require('./routers/user');

const serverPort = process.env.PORT || 4003

const app = express();

app.use(express.json());

app.use(userRouter);

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort)
})
