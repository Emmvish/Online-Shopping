const express = require('express')
const axios = require('axios')

const app = express();

const serverPort = process.env.PORT || 4001;

app.use(express.json());

const events = [];

const moderationServiceUrl = process.env.MODERATION_SERVICE_URL || 'http://localhost:4002/events'
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:4003/events'
const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:4004/events'
const researchServiceUrl = process.env.RESEARCH_SERVICE_URL || 'http://localhost:4005/events'
const cartServiceUrl = process.env.CART_SERVICE_URL || 'http://localhost:4006/events'
const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:4007/events'
const payoutServiceUrl = process.env.PAYOUT_SERVICE_URL || 'http://localhost:4008/events'

app.post('/events', (req, res)=>{
    const event = req.body;
    events.push(event);
    console.log('Event Received: ' + event.type)
    axios.post(moderationServiceUrl, event).catch((err)=>{
        console.log(err)
    })
    axios.post(userServiceUrl, event).catch((err)=>{
        console.log(err)
    })
    axios.post(productServiceUrl, event).catch((err)=>{
        console.log(err)
    })
    axios.post(researchServiceUrl, event).catch((err)=>{
        console.log(err)
    })
    axios.post(cartServiceUrl, event).catch((err)=>{
        console.log(err)
    })
    axios.post(orderServiceUrl, event).catch((err)=>{
        console.log(err)
    })
    axios.post(payoutServiceUrl, event).catch((err)=>{
        console.log(err)
    })
    res.send({ status: 'OK' })
})

app.get('/events', (req, res)=>{
    res.send(events);
})

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort);
})