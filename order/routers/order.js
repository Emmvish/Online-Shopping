const axios = require('axios');
const express = require('express');

const auth = require('../middleware/auth')
const Product = require('../models/product')
const Order = require('../models/order')

const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4001/events'

const router = new express.Router()

router.post('/order', auth, async (req, res) => {
    if(req.user.role === 'customer') {
        try {
            const product = await Product.findOne({ _id: req.body.product._id, status: 'approved' })
            if(!product) {
                throw new Error('Product was not found!')
            }
            if(product.quantity - req.body.product.quantity < 0){
                throw new Error('Product is not available in sufficient quantity!')
            }
            const order = new Order({ date: Date.now(), sellerId: product.sellerId, userId: req.user._id, productId: product._id, quantity: req.body.product.quantity, totalValue: req.body.product.quantity*product.price, status: 'pending' })
            await order.save();
            axios.post(eventBusUrl, { type: 'OrderCreated', data: { token: req.token, product: req.body.product, order } }).catch((err)=>{
                    console.log(err);
            })
            res.status(201).send({ order })
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a customer!' })
    }
})

router.post('/order/edit', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {
            const order = await Order.findOne({ _id: req.body.order._id, sellerId: req.user._id })
            if(!order) {
                throw new Error('This order does NOT exist!');
            }
            if(req.body.order.updates.status) {
                order.status = req.body.order.updates.status;
                await order.save();
                axios.post(eventBusUrl, { type: 'OrderEdited', data: { token: req.token, order: req.body.order } }).catch((err)=>{
                        console.log(err);
                })
                res.status(201).send({ order });
            } else {
                throw new Error('Invalid updates!')
            }
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.post('/order/all', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {
            const orders = await Order.find({ sellerId: req.user._id })
            res.status(200).send({ orders })
        } catch(e) {
            res.status(503).send({ error: e.message })
        }
    } else if(req.user.role === 'customer') {
        try {
            const orders = await Order.find({ userId: req.user._id })
            res.status(200).send({ orders })
        } catch(e) {
            res.status(503).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is neither a seller nor a customer!' })
    }
})

module.exports = router