const axios = require('axios')
const express = require('express')
const Filter = require('bad-words')

const app = express();
app.use(express.json())

app.post('/events', (req, res)=>{
    const { type, data } = req.body;
    if(type === 'ModerateProduct' && data.product.status === 'pending') {
        const filter = new Filter();
        if(filter.isProfane(data.product.name)) {
            data.product.status = 'rejected';
        } else {
            data.product.status = 'approved';
        }
        axios.post('http://localhost:4001/events', { type: 'ProductModerated', data }).catch((err)=>{
            console.log(err);
        })
    }
    res.status(200).send({ product: data.product });
})

app.listen(4002, ()=>{
    console.log('Listening at port: 4002')
})

module.exports = app;