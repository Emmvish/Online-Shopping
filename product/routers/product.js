const express = require('express');

const auth = require('../middleware/auth')
const Product = require('../models/product')

const router = new express.Router()

const eventBusUrl = process.env.EVENT_BUS_URL || 'amqp://localhost'; 
const connection = require('amqplib').connect(eventBusUrl);
const productQueue = process.env.PRODUCT_QUEUE || 'Product';

let productChannel;

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(productQueue).then(function(ok) {
        productChannel = ch;
    });
}).catch(console.warn);

router.post('/products/add', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {
            req.body.product.sellerId = req.user._id;   
            const product = new Product(req.body.product);
            await product.save();
            let event = { type: 'ProductAdded', data: { token: req.token, product: { _id: product._id, name: product.name, price: product.price, quantity: product.quantity } } }
            productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            event = { type: 'ModerateProduct', data: { token: req.token, product: { _id: product._id, name: product.name, status: 'pending' } } }
            productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            res.status(201).send({ product });
        } catch(e) {
            res.status(503).send({ error: 'Unable to add the product right now!' })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.delete('/products/delete', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {  
            const product = await Product.findOne({ sellerId: req.user._id, _id: req.body.product._id });
            if(!product) {
                throw new Error('This product does NOT exist in the database!');
            }
            await product.remove();
            const event = { type: 'ProductRemoved', data: { token: req.token, product: { _id: req.body.product._id } } }
            productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            res.status(200).send({ product: { _id: req.body.product._id } });
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.patch('/products/edit', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {  
            const product = await Product.findOne({ sellerId: req.user._id, _id: req.body.product._id });
            if(!product) {
                throw new Error('This product does NOT exist in the database!');
            }
            const allowedUpdates = ['name', 'price', 'quantity'];
            const updates = Object.keys(req.body.product.updates);
            const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
            const isValidUpdateValue = true;
            allowedUpdates.forEach((field)=>{
                if(updates[field] === '') {
                    isValidUpdateValue = false;
                }
            })
            if (!isValidOperation || !isValidUpdateValue) {
                throw new Error('Invalid updates!');
            }
            updates.forEach((update) => product[update] = req.body.product.updates[update])
            await product.save();
            const event = { type: 'ProductEdited', data: { token: req.token, product: { _id: req.body.product._id, updates: req.body.product.updates } } }
            productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            if(updates.includes('name')) {
                const event = { type: 'ModerateProduct', data: { token: req.token, product: { _id: product._id, name: product.name, status: 'pending' } } }
                productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            }
            res.status(200).send({ product: { _id: req.body.product._id } });
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else if (req.user.role === 'admin') {
        try {  
            const product = await Product.findOne({ _id: req.body.product._id });
            if(!product) {
                throw new Error('This product does NOT exist in the database!');
            }
            if(req.body.product.updates.status && req.body.product.updates.status === 'rejected') {
                product.status = req.body.product.updates.status;
                await product.save();
                const event = { type: 'ProductEdited', data: { token: req.token, product: { _id: req.body.product._id, updates: { status: product.status } } } }
                productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
                res.status(200).send({ message: 'This product has now been rejected!' });
            } else {
                throw new Error('Invalid updates!');
            }
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.get('/products', auth, async (req, res) => {
    if(req.user.role === 'seller' || req.user.role === 'admin') {
        try {  
            let sellerId;
            if(req.user.role === 'admin') {
                sellerId = req.query.sellerId;
            } else {
                sellerId = req.user._id;
            }
            if(req.query.firstSearch === 'true') {
                const results = await Product.find({ sellerId })
                                             .sort({ createdAt: -1 });
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const products = [];
                for( let i = 0; i < limit; i++ ) {
                    if(results[i]){
                        products.push(results[i]);
                    }
                }
                res.status(201).send({ products, totalResults: results.length });
            } else {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const offset = (req.query.pageNo - 1)*limit;
                const products = await Product.find({ sellerId })
                                              .sort({ createdAt: -1 })
                                              .skip(offset)
                                              .limit(limit);
                res.status(201).send({ products });
            }
        } catch(e) {
            res.status(503).send({ error: 'Unable to fetch the products right now!' })
        }
    } else {
        res.status(400).send({ error: 'You cannot access this route as a customer!' })
    }
})

router.post('/products/rate', auth, async (req, res) => {
    if(req.user.role === 'customer') {
        try {  
            const product = await Product.findOne({ _id: req.body.product._id, status: 'approved' });
            if(!product) {
                throw new Error('This product does NOT exist in the database!')
            }
            product.rating = ((product.totalRatings*product.rating) + req.body.product.rating)/(product.totalRatings + 1);
            product.totalRatings++;
            await product.save();
            const event = { type: 'ProductRated', data: { token: req.token, product: { _id: product._id, rating: product.rating } } }
            productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            res.status(201).send({ product });
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a customer!' })
    }
})

module.exports = router
