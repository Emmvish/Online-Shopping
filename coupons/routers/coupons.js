const express = require('express');

const User = require('../models/user')
const Product = require('../models/product')

const auth = require('../middleware/auth')

const router = new express.Router()

const eventBusUrl = process.env.EVENT_BUS_URL || 'amqp://localhost'
const connection = require('amqplib').connect(eventBusUrl);
const couponQueue = process.env.COUPON_QUEUE || 'Coupon';

let couponChannel;

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(couponQueue).then(function(ok) {
        couponChannel = ch;
    });
}).catch(console.warn);

router.post('/coupons/add', auth, async (req, res)=>{
    if(req.user.role === 'seller') {
        try {
            if(req.body.coupon.productId) {
                const product = await Product.findOne({ _id: req.body.coupon.productId, sellerId: req.user._id, status: 'approved' });
                if(!product) {
                    throw new Error('Product was NOT found in the database')
                }
                req.body.coupon.productName = product.name;
            }
            if(req.body.coupon.discountPercentage < 10 || req.body.coupon.discountPercentage > 90) {
                throw new Error('Discount Percentage should be between 10 and 90.')
            }
            const coupon = req.user.coupons.find((coupon) => coupon.code === req.body.coupon.code);
            if(coupon) {
                throw new Error('This coupon already exists!');
            }
            req.body.coupon.sellerId = req.user._id;
            req.body.coupon.sellerName = req.user.name;
            req.user.coupons.push(req.body.coupon);
            await req.user.save();
            const users = await User.find({ role: 'customer' });
            for( let i = 0; i < users.length; i++ ) {
                users[i].coupons.push(req.body.coupon)
                await users[i].save()
            }
            const event = { type: 'CouponCreated', data: { token: req.token, coupon: req.body.coupon } }
            couponChannel.sendToQueue(couponQueue, Buffer.from(JSON.stringify(event)));
            res.status(201).send({ message: "Coupon has been added!" })
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: "You can only make this request as a seller!" })
    }
})

router.delete('/coupons/delete', auth, async (req, res)=>{
    if(req.user.role === 'seller') {
        try {
            if(req.body.coupon.productId) {
                const product = await Product.findOne({ _id: req.body.coupon.productId, sellerId: req.user._id, status: 'approved' });
                if(!product) {
                    throw new Error('Product was NOT found in the database')
                }
            }
            req.user.coupons = req.user.coupons.filter((coupon) => coupon.code !== req.body.coupon.code);
            await req.user.save();
            const users = await User.find({ role: 'customer' });
            for( let i = 0; i < users.length; i++ ) {
                users[i].coupons = users[i].coupons.filter((coupon) => coupon.code !== req.body.coupon.code);
                await users[i].save()
            }
            const event = { type: 'CouponDeleted', data: { token: req.token, coupon: req.body.coupon } }
            couponChannel.sendToQueue(couponQueue, Buffer.from(JSON.stringify(event)));
            res.status(200).send({ message: "Coupon has been removed!" })
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: "You can only make this request as a seller!" })
    }
})

router.get('/coupons/view', auth, async (req, res)=>{
    if(req.user.role === 'seller' || req.user.role === 'customer') {
        res.status(200).send({ coupons: req.user.coupons });
    } else {
        res.status(400).send({ error: "You can only make this request as a seller or a customer!" })
    }
})

module.exports = router