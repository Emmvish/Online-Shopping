const axios = require('axios');
const express = require('express');

const auth = require('../middleware/auth')
const Cart = require('../models/cart')
const Product = require('../models/product')

const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4001/events'

const router = new express.Router()

router.post('/cart/editProductQuantity', auth, async (req, res) => {
    if(req.user.role === 'customer') {
        try {
            const product = await Product.findOne({ _id: req.body.product._id, status: 'approved' });
            if(!product || product.quantity < req.body.product.quantity) {
                throw new Error('This product does NOT exist in the database!');
            }
            const cart = await Cart.findOne({ userId: req.user._id });
            const productExistsInCart = cart.products.find((product) => product.productId === req.body.product._id );
            if(productExistsInCart) {
                const newQuantity = productExistsInCart.quantity + req.body.product.quantity;
                if(product.quantity < newQuantity) {
                    throw new Error('Sufficient quantity of this product is NOT available to meet your order!');
                }
                if(newQuantity < 1) {
                    cart.products = cart.products.filter((product) => product.productId !== req.body.product._id )
                } else {
                    cart.products.forEach((product) => {
                        if(product.productId === req.body.product._id) {
                            product.quantity = product.quantity + req.body.product.quantity;
                        }
                    })
                }
            } else {
                cart.products = cart.products.concat({ productId: req.body.product._id, quantity: req.body.product.quantity, ordered: false });
            }
            await cart.save();
            res.status(201).send({ cart })
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: "You can only perform this operation as a customer!" });
    }
})

router.post('/cart/delete', auth, async (req, res) => {
    if(req.user.role === 'customer') {
        try {
            const cart = await Cart.findOne({ userId: req.user._id });
            const product = cart.products.find((product) => product.productId === req.body.product._id)
            if(product) {
                cart.products = cart.products.filter((product) => product.productId !== req.body.product._id )
                await cart.save();
                res.status(201).send({ cart })
            } else {
                throw new Error();
            }
        } catch(e) {
            res.status(404).send({ error: 'This product was NOT found in your cart!' })
        }
    } else {
        res.status(400).send({ error: "You can only perform this operation as a customer!" });
    }
})

router.post('/cart', auth, async (req, res) => {
    if(req.user.role === 'customer') {
        try {
            const cart = await Cart.findOne({ userId: req.user._id });
            res.status(200).send({ cart })
        } catch(e) {
            res.status(503).send({ error: 'Unable to fetch your cart right now!' })
        }
    } else {
        res.status(400).send({ error: "You can only perform this operation as a customer!" });
    }
})

router.post('/cart/placeOrder', auth, async (req, res) => {
    if(req.user.role === 'customer') {
        try {
            const cart = await Cart.findOne({ userId: req.user._id });
            cart.products.forEach((product) => {
                const originalProduct = await Product.findOne({ _id: product.productId });
                if(originalProduct.quantity < product.quantity) {
                    continue;
                }
                axios.post(eventBusUrl, { type: 'PlaceOrder', data: { token: req.token, product } }).catch((err)=>{
                    console.log(err);
                })
                product.ordered = true;
            })
            cart.products = cart.products.filter((product) => product.ordered !== true)
            await cart.save();
            if(cart.products.length > 0) {
                res.status(206).send({ error: 'Some of your products could NOT be ordered!' })
            } else {
                res.status(201).send({ message: 'Order Placed!' })
            }
        } catch(e) {
            res.status(503).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: "You can only perform this operation as a customer!" });
    }
})

module.exports = router