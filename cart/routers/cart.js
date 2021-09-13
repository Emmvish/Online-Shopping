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
            if(!product) {
                throw new Error('This product does NOT exist in the database!');
            }
            const cart = await Cart.findOne({ userId: req.user._id });
            const productExistsInCart = cart.products.find((product) => product.productId.toString() === req.body.product._id.toString() );
            if(productExistsInCart) {
                const newQuantity = productExistsInCart.quantity + req.body.product.quantity;
                if(product.quantity < newQuantity) {
                    throw new Error('Sufficient quantity of this product is NOT available to meet your order!');
                }
                if(newQuantity < 1) {
                    cart.products = cart.products.filter((product) => product.productId.toString() !== req.body.product._id.toString() )
                } else {
                    cart.products.forEach((product) => {
                        if(product.productId.toString() === req.body.product._id.toString()) {
                            product.quantity = product.quantity + req.body.product.quantity;
                        }
                    })
                }
            } else {
                if(cart.products.length === 10) {
                    throw new Error('Your cart is already full, please remove or purchase an item to add this product to your cart!');
                }
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

router.post('/cart/applyCoupon', auth, async(req, res) => {
    if(req.user.role === 'customer') {
        try {
            const coupon = req.user.coupons.find((coupon) => coupon.code === req.body.coupon.code);
            if(!coupon || coupon.discountPercentage < 10 || coupon.discountPercentage > 90) {
                throw new Error('Invalid Coupon!')
            }
            const cart = await Cart.findOne({ userId: req.user._id });
            if(coupon.sellerId && !coupon.productId) {
                for( let i = 0; i < cart.products.length; i++ ) {
                    const productDetails = await Product.findOne({ _id: cart.products[i].productId })
                    if(productDetails.sellerId.toString() === coupon.sellerId.toString()) {
                        if(cart.products[i].coupon[0]) {
                            req.user.coupons.push(cart.products[i].coupon[0])
                            await axios.post(eventBusUrl, { type: 'CouponAddedBack', data: { token: req.token, coupon: cart.products[i].coupon[0] } })
                        }
                        cart.products[i].coupon[0] = coupon;
                        cart.markModified('products.' + i + '.coupon.0')
                    }
                }
                await cart.save();
            } else if(coupon.productId) {
                cart.products.forEach(async (product, i) => {
                    if(product.productId.toString() === coupon.productId.toString()) {
                        if(product.coupon[0]) {
                            req.user.coupons.push(product.coupon[0])
                            await axios.post(eventBusUrl, { type: 'CouponAddedBack', data: { token: req.token, coupon: product.coupon[0] } })
                        }
                        product.coupon[0] = coupon;
                        cart.markModified('products.' + i + '.coupon.0')
                        return;
                    }
                })
                await cart.save();
            }
            req.user.coupons = req.user.coupons.filter((coupon) => coupon.code !== req.body.coupon.code);
            await req.user.save();
            res.status(200).send({ message: 'Coupon has been consumed!' })
        } catch(e) {
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'You can only make this request as a customer!' })
    }
})

router.delete('/cart/deleteCoupon', auth, async(req, res) => {
    if(req.user.role === 'customer') {
        try {
            const cart = await Cart.findOne({ userId: req.user._id });
            let couponRemoved = false;
            let removedCoupon;
            if(req.body.coupon && req.body.coupon.productId) {
                cart.products.forEach((product, i) => {
                    if(product.coupon[0] && product.coupon[0].productId.toString() === req.body.coupon.productId.toString()) {
                        removedCoupon = product.coupon[0]
                        product.coupon[0] = null;
                        cart.markModified('products.' + i + '.coupon.0')
                        couponRemoved = true;
                        return;
                    }
                })
            } else if(req.body.coupon && req.body.coupon.sellerId && !req.body.coupon.productId) {
                cart.products.forEach((product, i) => {
                    if(product.coupon[0] && product.coupon[0].sellerId.toString() === req.body.coupon.sellerId.toString()) {
                        couponRemoved = true;
                        removedCoupon = product.coupon[0]
                        product.coupon[0] = null;
                        cart.markModified('products.' + i + '.coupon.0')
                    }
                })
            }
            if(couponRemoved) {
                await cart.save();
                req.user.coupons.push(removedCoupon)
                await req.user.save();
                await axios.post(eventBusUrl, { type: 'CouponAddedBack', data: { token: req.token, coupon: req.body.coupon } })
                res.status(200).send({ message: 'Coupon has been removed from this product/seller!' })
            } else {
                throw new Error('Invalid Coupon!')
            }
        } catch(e){
            res.status(404).send({ error: e.message })
        }
    } else {
        res.status(400).send({ error: 'You can only make this request as a customer!' })
    }
})

router.delete('/cart/delete', auth, async (req, res) => {
    if(req.user.role === 'customer') {
        try {
            const cart = await Cart.findOne({ userId: req.user._id });
            const product = cart.products.find((product) => product.productId.toString() === req.body.product._id.toString())
            if(product) {
                await axios.post(eventBusUrl, { type: 'CouponAddedBack', data: { token: req.token, coupon: product.coupon[0] } })
                cart.products = cart.products.filter((product) => product.productId.toString() !== req.body.product._id.toString() )
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

router.get('/cart', auth, async (req, res) => {
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
            for( let i = 0; i < cart.products.length; i++ ) {
                const product = cart.products[i];
                const coupon = product.coupon[0];
                delete product.coupon;
                product.coupon = coupon;
                const originalProduct = await Product.findOne({ _id: product.productId });
                if(originalProduct.quantity < product.quantity) {
                    continue;
                }
                try {
                    await axios.post(eventBusUrl, { type: 'PlaceOrder', data: { token: req.token, product } })
                    product.ordered = true;
                } catch(err) {
                    console.log(err);
                }
            }
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