const express = require('express');

const eventBusUrl = process.env.EVENT_BUS_URL || 'amqp://localhost'; 
const connection = require('amqplib').connect(eventBusUrl);
const userQueue = process.env.USER_QUEUE || 'User';

let userChannel;

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(userQueue).then(function(ok) {
        userChannel = ch;
    });
}).catch(console.warn);

const User = require('../models/user')
const auth = require('../middleware/auth')
const router = new express.Router()

router.post('/auth/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.name, req.body.password)
        if(!user) {
            throw new Error('User was not found!')
        }
        const token = await user.generateAuthToken()
        const event = { type: 'UserLoggedIn', data: { name: user.name, token } }
        userChannel.sendToQueue(userQueue, Buffer.from(JSON.stringify(event)));
        res.status(200).send({ user, token })
    } catch (e) {
        res.status(404).send({ error: e.message })
    }
})

router.post('/auth/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        const event = { type: 'UserLoggedOut', data: { token: req.token } }
        userChannel.sendToQueue(userQueue, Buffer.from(JSON.stringify(event)));
        res.status(200).send()
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router
