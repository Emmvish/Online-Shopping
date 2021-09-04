const express = require('express')

require('./db/mongoose')
const userRouter = require('./routers/user');

const app = express();

app.use(express.json());

app.use(userRouter);

app.post('/events', (req, res)=>{
    console.log('Event: ' + req.body);
    res.send();
})

app.listen(4003, ()=>{
    console.log('Listening at port: 4003')
})

module.exports = app;