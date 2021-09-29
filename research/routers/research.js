const express = require('express');

const User = require('../models/user')
const Product = require('../models/product')

const auth = require('../middleware/auth')

const router = new express.Router()

router.get('/search/users', auth, async (req, res) => {
    if(req.user.role === 'customer' || req.user.role === 'admin') {
        try {
            if(req.query.firstSearch === 'true') {
                let results;
                if(req.user.role === 'admin') {
                    results = await User.find({ name: { $regex: req.query.searchTerm, $options: 'i' } }, { name: 1, role: 1, address: 1, email: 1 }).sort({ createdAt: -1 })
                } else {
                    results = await User.find({ name: { $regex: req.query.searchTerm, $options: 'i' }, role: 'seller' }, { name: 1, role: 1, address: 1, email: 1 }).sort({ createdAt: -1 })
                }
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const users = results.slice(0, limit);
                res.status(200).send({ users, totalResults: results.length });
            } else {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const offset = (req.query.pageNo - 1)*limit;
                let users;
                if(req.user.role === 'admin') {
                users = await User.find({ name: { $regex: req.query.searchTerm, $options: 'i' } }, { name: 1, role: 1, address: 1, email: 1 })
                    .sort({ createdAt: -1 })
                    .skip(offset)
                    .limit(limit);
                } else {
                    users = await User.find({ name: { $regex: req.query.searchTerm, $options: 'i' }, role: 'seller' }, { name: 1, role: 1, address: 1, email: 1 })
                    .sort({ createdAt: -1 })
                    .skip(offset)
                    .limit(limit);
                }
                res.status(200).send({ users });
            }
        } catch(e) {
            res.status(503).send({ error: 'Unable to perform search right now!' })
        }
    } else {
        res.status(400).send({ error: 'You cannot search as a seller!' });
    }
})

router.get('/search/products', auth, async (req, res) => {
    if(req.user.role === 'customer' || req.user.role === 'admin') {
        try {
            if(req.query.firstSearch === 'true') {
                let results;
                if(req.user.role === 'admin') {
                    results = await Product.find({ name: { $regex: req.query.searchTerm, $options: 'i' } }).sort({ createdAt: -1 });
                } else {
                    results = await Product.find({ name: { $regex: req.query.searchTerm, $options: 'i' }, status: 'approved', quantity: { $gt: 0 } }).sort({ rating: -1 });
                }
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const products = results.slice(0, limit);
                res.status(200).send({ products, totalResults: results.length });
            } else {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const offset = (req.query.pageNo - 1)*limit;
                let products;
                if(req.user.role === 'admin') {
                    products = await Product.find({ name: { $regex: req.query.searchTerm, $options: 'i' } })
                    .sort({ createdAt: -1 })
                    .skip(offset)
                    .limit(limit);
                } else {
                    products = await Product.find({ name: { $regex: req.query.searchTerm, $options: 'i' }, status: 'approved', quantity: { $gt: 0 } }).sort({ rating: -1 })
                                                               .find({ status: 'approved', quantity: { $gt: 0 } }).skip(offset)
                                                                   .limit(limit)
                }
                res.status(200).send({ products });
            }
        } catch(e) {
            console.log(e.message)
            res.status(503).send({ error: 'Unable to perform search right now!' })
        }
    } else {
        res.status(400).send({ error: 'You cannot search as a seller!' });
    }
})

router.get('/search/sellerProducts', auth, async (req, res)=>{
    if(req.user.role === 'customer') {
        try {
            if(req.query.firstSearch === 'true') {
                const results = await Product.find({ sellerId: req.query.sellerId, status: 'approved', quantity: { $gt: 0 } }).sort({ createdAt: -1 });
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const products = results.slice(0, limit);
                res.status(200).send({ products, totalResults: results.length });
            } else {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const offset = (req.query.pageNo - 1)*limit;
                const products = await Product.find({ sellerId: req.query.sellerId, status: 'approved', quantity: { $gt: 0 } })
                                              .sort({ createdAt: -1 })
                                              .skip(offset)
                                              .limit(limit);
                res.status(200).send({ products });
            }
        } catch(e) {
            console.log(e.message);
            res.status(503).send({ error: 'Unable to perform search right now!' })
        }

    } else {
        res.status(400).send({ error: 'This user is not a customer!' })
    }
})

router.get('/search/getSeller', auth, async (req, res)=>{
    if(req.user.role === 'customer') {
        try {
            const seller = await User.findOne({ _id: req.query.sellerId, role: 'seller' });
            if(!seller) {
                res.status(404).send({ error: 'This user does NOT exist in our database!' })
            } else {
                res.status(200).send({ seller });
            }
        } catch(e) {
            res.status(503).send({ error: 'Unable to perform search right now!' })
        }
    } else {
        res.status(400).send({ error: 'This user is not a customer!' })
    }
})

module.exports = router
