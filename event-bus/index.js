const express = require('express')
const axios = require('axios')

const app = express();
app.use(express.json());

const events = [];

app.post('/events', (req, res)=>{
    const event = req.body;
    events.push(event);
    axios.post('http://localhost:4002/events', event).catch((err)=>{
        console.log(err)
    })
    axios.post('http://localhost:4003/events', event).catch((err)=>{
        console.log(err)
    })
    axios.post('http://localhost:4004/events', event).catch((err)=>{
        console.log(err)
    })
    axios.post('http://localhost:4005/events', event).catch((err)=>{
        console.log(err)
    })
    axios.post('http://localhost:4006/events', event).catch((err)=>{
        console.log(err)
    })
    axios.post('http://localhost:4007/events', event).catch((err)=>{
        console.log(err)
    })
    axios.post('http://localhost:4008/events', event).catch((err)=>{
        console.log(err)
    })
    res.send({ status: 'OK' })
})

app.get('/events', (req, res)=>{
    res.send(events);
})

app.listen(4001, ()=>{
    console.log('Listening at port: 4001');
})