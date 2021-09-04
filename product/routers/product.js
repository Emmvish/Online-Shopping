const axios = require('axios');
const express = require('express');

const auth = require('../middleware/auth')
const Product = require('../models/product')

const router = new express.Router()

router.post('/products/add', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {
            req.body.product.sellerId = req.user._id;   
            const product = new Product(req.body.product);
            await product.save();
            axios.post('http://localhost:4001/events', { type: 'ProductAdded', data: { token: req.token, product: { _id: product._id, name: product.name, price: product.price, quantity: product.quantity } } }).catch((err)=>{
                console.log(err);
            })
            axios.post('http://localhost:4001/events', { type: 'ModerateProduct', data: { token: req.token, product: { _id: product._id, name: product.name, status: 'pending' } } }).catch((err)=>{
                console.log(err);
            })
            res.status(201).send({ product });
        } catch(e) {
            res.status(503).send({ error: 'Unable to add the product right now!' })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.post('/products/delete', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {  
            const product = await Product.findOne({ sellerId: req.user._id, _id: req.body.product._id });
            if(!product) {
                throw new Error('This product does NOT exist in the database!');
            }
            await product.remove();
            axios.post('http://localhost:4001/events', { type: 'ProductRemoved', data: { token: req.token, product: { _id: req.body.product._id } } }).catch((err)=>{
                console.log(err);
            })
            res.status(200).send({ product: { _id: req.body.product._id } });
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.post('/products/edit', auth, async (req, res) => {
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
                if(data.updates[field] === '') {
                    isValidUpdateValue = false;
                }
            })
            if (!isValidOperation || !isValidUpdateValue) {
                throw new Error('Invalid updates!');
            }
            updates.forEach((update) => product[update] = req.body.product[update])
            await product.save();
            axios.post('http://localhost:4001/events', { type: 'ProductEdited', data: { token: req.token, product: { _id: req.body.product._id, updates: req.body.product.updates } } }).catch((err)=>{
                console.log(err);
            })
            if(updates.includes('name')) {
                axios.post('http://localhost:4001/events', { type: 'ModerateProduct', data: { token: req.token, product: { _id: product._id, name: product.name, status: 'pending' } } }).catch((err)=>{
                    console.log(err);
                })
            }
            res.status(200).send({ product: { _id: req.body.product._id } });
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.post('/products', auth, (req, res) => {
    if(req.user.role === 'seller') {
        try {  
            const products = await Product.find({ sellerId: req.user._id });
            res.status(201).send({ products });
        } catch(e) {
            res.status(503).send({ error: 'Unable to fetch the products right now!' })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.post('/products/rate', auth, (req, res) => {
    if(req.user.role === 'customer') {
        try {  
            const product = await Product.findOne({ _id: req.body.product._id, status: 'approved' });
            if(!product) {
                throw new Error('This product does NOT exist in the database!')
            }
            product.rating = ((product.totalRatings*product.rating) + req.body.product.rating)/(product.totalRatings + 1);
            product.totalRatings++;
            await product.save();
            axios.post('http://localhost:4001/events', { type: 'ProductRated', data: { token: req.token, product: { _id: product._id, rating: product.rating } } }).catch((err)=>{
                console.log(err);
            })
            res.status(201).send({ product });
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a customer!' })
    }
})

module.exports = router