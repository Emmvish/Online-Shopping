const express = require('express')
const jwt = require('jsonwebtoken')

const User = require('./models/user')
require('./db/mongoose')
const userRouter = require('./routers/user');

const eventBusUrl = process.env.EVENT_BUS_URL || 'amqp://localhost'
const connection = require('amqplib').connect(eventBusUrl);
const userQueue = process.env.USER_QUEUE || 'User';

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(userQueue).then(function(ok) {
        return ch.consume(userQueue, function(msg) {
        if (msg !== null) {
            const { type, data } = JSON.parse(msg.content.toString())
            handleEvent(type, data);
            ch.ack(msg);
        }
    });
});  
}).catch(console.warn);

const serverPort = process.env.PORT || 4003

const app = express();

app.use(express.json());

app.use(userRouter);

async function handleEvent(type, data) {

    const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'

    switch(type) {

        case 'UserLoggedIn': 
            try {
                const user = await User.findOne({ name: data.name });
                if(!user) {
                    throw new Error('User Not Found!');
                }
                user.tokens = user.tokens.concat({ token: data.token });
                await user.save();
            } catch(e) {
                console.log(e.message)
            }
            break;

        case 'UserLoggedOut':
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token })
                user.tokens = user.tokens.filter((token) => token.token !== data.token);
                await user.save();
            } catch(e) {
                console.log(e.message)
            }
            break;

    }
}

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort)
})

module.exports = app;