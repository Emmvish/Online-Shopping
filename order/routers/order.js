const express = require('express');

const auth = require('../middleware/auth')
const Product = require('../models/product')
const User = require('../models/user')
const Order = require('../models/order')

const eventBusUrl = process.env.EVENT_BUS_URL || "amqp://localhost"
const connection = require('amqplib').connect(eventBusUrl);
const orderQueue = process.env.ORDER_QUEUE || 'Order';
const couponQueue = process.env.COUPON_QUEUE || 'Coupon';

let orderChannel;
let couponChannel;

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(orderQueue).then(function(ok) {
        orderChannel = ch;
    });
}).catch(console.warn);

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(couponQueue).then(function(ok) {
        couponChannel = ch;
    });
}).catch(console.warn);

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
            let finalPrice = product.price;
            if(req.body.coupon) {
                const coupon = req.user.coupons.find((coupon) => coupon.code === req.body.coupon.code);
                if(!coupon || coupon.discountPercentage < 10 || coupon.discountPercentage > 90) {
                    throw new Error('Invalid Coupon!')
                }
                if(coupon && coupon.sellerId.toString() === product.sellerId.toString()) {
                    if(coupon.productId) {
                        if(coupon.productId.toString() !== product._id.toString()) {
                            throw new Error('Invalid Coupon!')
                        }
                    }
                    finalPrice = finalPrice*(1 - (coupon.discountPercentage/100))
                    req.user.coupons = req.user.coupons.filter((coupon) => coupon.code !== req.body.coupon.code)
                    await req.user.save();
                    const event = { type: 'CouponUsed', data: { token: req.token, coupon: req.body.coupon } }
                    couponChannel.sendToQueue(couponQueue, Buffer.from(JSON.stringify(event)));
                } else {
                    throw new Error('Invalid Coupon!')
                }
            }
            const order = new Order({ date: Date.now(), sellerId: product.sellerId, userId: req.user._id, productId: product._id, quantity: req.body.product.quantity, totalValue: req.body.product.quantity*finalPrice, status: 'pending' })
            await order.save();
            const event = { type: 'OrderCreated', data: { token: req.token, product: req.body.product, order } }
            orderChannel.sendToQueue(orderQueue, Buffer.from(JSON.stringify(event)));
            res.status(201).send({ order })
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is NOT a customer!' })
    }
})

router.patch('/order/edit', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {
            const order = await Order.findOne({ _id: req.body.order._id, sellerId: req.user._id })
            if(!order) {
                throw new Error('This order does NOT exist!');
            }
            if(req.body.order.updates.status) {
                order.status = req.body.order.updates.status;
                await order.save();
                const event = { type: 'OrderEdited', data: { token: req.token, order: req.body.order } }
                orderChannel.sendToQueue(orderQueue, Buffer.from(JSON.stringify(event)));
                if(req.body.order.updates.status === 'cancelled') {
                    const product = await Product.findOne({ _id: order.productId })
                    product.quantity += order.quantity;
                    await product.save();
                    const event = { type: 'OrderCancelled', data: { token: req.token, product: { productId: product._id, updates: { quantity: product.quantity } } } }
                    orderChannel.sendToQueue(orderQueue, Buffer.from(JSON.stringify(event)));
                }
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

function joinProductsWithOrders(products, orders) {
    const results = [];
    products.forEach((product) => {
        orders.forEach((order) => {
            if(product._id.toString() === order.productId.toString()) {
                const { name, quantity, price, rating, totalRatings } = product;
                results.push({ date: order.date, status: order.status, totalValue: order.totalValue, orderedQuantity: order.quantity, productName: name, productQuantity: quantity, productPrice: price, productRating: rating, productTotalRatings: totalRatings, customerId: order.userId, sellerId: order.sellerId });
            }
        })
    })
    return results;
}

async function joinResultsWithCustomers(results) {
    const users = await User.find({ role: 'customer' });
    users.forEach((user)=>{
        results.forEach((result)=>{
            if(result.customerId.toString() === user._id.toString()) {
                result.customerName = user.name;
                result.customerEmail = user.email;
                result.customerAddress = user.address;
            }
        })
    })
    return results;
}

async function joinResultsWithSellers(results) {
    const users = await User.find({ role: 'seller' });
    users.forEach((user)=>{
        results.forEach((result)=>{
            if(result.sellerId.toString() === user._id.toString()) {
                result.sellerName = user.name;
                result.sellerEmail = user.email;
                result.sellerAddress = user.address;
            }
        })
    })
    return results;
}

router.get('/order/all', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        try {
            const products = await Product.find({ sellerId: req.user._id });
            const orderSearchObject = { sellerId: req.user._id };
            if(req.query.status) {
                const validStatuses = ['delivered','shipped','pending','cancelled']
                if(validStatuses.includes(req.query.status)) {
                    orderSearchObject.status = req.query.status;
                } else {
                    throw new Error('Invalid Order Status!');
                }
            }
            if(req.query.firstSearch === 'true') {
                const orders = await Order.find(orderSearchObject).sort({ createdAt: -1 })
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const results = joinProductsWithOrders(products, orders);
                const finalResults = await joinResultsWithCustomers(results);
                const actualList = [];
                for( let i = 0; i < limit; i++ ) {
                    if(finalResults[i]) {
                        actualList.push(finalResults[i]);
                    } else {
                        break;
                    }
                }
                res.status(200).send({ orders: actualList, totalResults: finalResults.length });
            } else {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const offset = (req.query.pageNo - 1)*req.query.limit;
                const orders = await Order.find(orderSearchObject)
                                          .sort({ createdAt: -1 })
                                          .skip(offset)
                                          .limit(limit);
                const results = joinProductsWithOrders(products, orders);
                const finalResults = await joinResultsWithCustomers(results);
                res.status(200).send({ orders: finalResults }); 
            }
        } catch(e) {
            res.status(503).send({ error: e.message })
        }
    } else if(req.user.role === 'customer') {
        try {
            const products = await Product.find({ });
            const orderSearchObject = { userId: req.user._id };
            if(req.query.status) {
                const validStatuses = ['delivered','shipped','pending','cancelled']
                if(validStatuses.includes(req.query.status)) {
                    orderSearchObject.status = req.query.status;
                } else {
                    throw new Error('Invalid Order Status!');
                }
            }
            if(req.query.firstSearch === 'true') {
                const orders = await Order.find(orderSearchObject).sort({ createdAt: -1 })
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const results = joinProductsWithOrders(products, orders);
                const finalResults = await joinResultsWithSellers(results);
                const actualList = [];
                for( let i = 0; i < limit; i++ ) {
                    if(finalResults[i]) {
                        actualList.push(finalResults[i]);
                    } else {
                        break;
                    }
                }
                res.status(200).send({ orders: actualList, totalResults: results.length });
            } else {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const offset = (req.query.pageNo - 1)*limit;
                const orders = await Order.find(orderSearchObject)
                                          .sort({ createdAt: -1 })
                                          .skip(offset)
                                          .limit(limit);
                const results = joinProductsWithOrders(products, orders);
                const finalResults = await joinResultsWithSellers(results);
                res.status(200).send({ orders: finalResults }); 
            }
        } catch(e) {
            res.status(503).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'This user is neither a seller nor a customer!' })
    }
})

module.exports = router
