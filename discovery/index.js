const express = require('express')

const router = require('./router/router')

const serverPort = process.env.PORT || 4000

const app = express();

app.use(express.json());

app.post("/sendRequest", async (req, res) => {
    try {
        const requests = req.body.requests;
        const promises = [];
        requests.forEach((request) => {
            const { service, route, method, query, data, authHeader = null } = request;
            promises.push(router(service, route, method, query, data, authHeader))
        })
        const responses = await Promise.allSettled(promises);
        res.status(200).send({ responses });
    } catch(e) {
        res.status(503).send({ message: 'Service Unavailable!' })
    }
})

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort)
})
