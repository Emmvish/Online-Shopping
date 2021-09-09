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
                const users = [];
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                for( let i = 0; i < limit; i++ ) {
                    if(results[i]) {
                        users.push(results[i]);
                    }
                }
                res.status(200).send({ users, totalResults: results.length });
            } else {
                const offset = (req.query.pageNo - 1)*req.query.limit;
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
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
                    results = await Product.find({ name: { $regex: req.query.searchTerm, $options: 'i' }, status: 'approved', quantity: { $gt: 0 } }).sort({ createdAt: -1 });
                }
                const products = [];
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                for( let i = 0; i < limit; i++ ) {
                    if(results[i]) {
                        products.push(results[i]);
                    }
                }
                res.status(200).send({ products, totalResults: results.length });
            } else {
                const offset = (req.query.pageNo - 1)*req.query.limit;
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                let products;
                if(req.user.role === 'admin') {
                    products = await Product.find({ name: { $regex: req.query.searchTerm, $options: 'i' } })
                    .sort({ createdAt: -1 })
                    .skip(offset)
                    .limit(limit);
                } else {
                    products = await Product.find({ name: { $regex: req.query.searchTerm, $options: 'i' }, status: 'approved', quantity: { $gt: 0 } }).sort({ createdAt: -1 })
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

module.exports = router