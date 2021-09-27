const express = require('express')

const router = require('./router/router')

const serverPort = process.env.PORT || 4000

const app = express();

app.use(express.json());

app.post("/sendRequest", async (req, res) => {
    const { service, route, method, data } = req.body;
    const query = req.query;
    const authHeader = req.headers.Authorization;
    let response;
    if(!!authHeader) {
        response = await router(service, route, method, query, data, authHeader);
    } else {
        response = await router(service, route, method, query, data, null);
    }
    res.status(response.status).send({ data: response.data, status: response.status });
})

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort)
})
