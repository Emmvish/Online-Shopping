const express = require('express');

const User = require('../models/user')
const Product = require('../models/product')

const auth = require('../middleware/auth')

const router = new express.Router()

router.get('/search/users', auth, async (req, res) => {
    if(req.user.role === 'customer' || req.user.role === 'admin') {
        try {
            const searchTerm = "/" + req.query.searchTerm + "/i";
            const searchObject = {
                name: searchTerm
            }
            if(req.user.role === 'customer') {
                searchObject.role = 'seller';
            }
            if(req.query.firstSearch) {
                const results = await User.find(searchObject, { name: 1, role: 1, address: 1, email: 1 })
                                          .sort('createdAt', -1);
                const users = [];
                const limit = req.query.limit ? req.query.limit : 10;
                for( let i = 0; i < limit; i++ ) {
                    users.push(results[i]);
                }
                res.status(200).send({ users, totalResults: results.length });
            } else {
                const offset = (req.query.pageNo - 1)*req.query.limit;
                const limit = req.query.limit ? req.query.limit : 10;
                const users = await User.find(searchObject, { name: 1, role: 1, address: 1, email: 1 })
                                        .sort('createdAt', -1)
                                        .skip(offset)
                                        .limit(limit);
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
            const searchTerm = "/" + req.query.searchTerm + "/i";
            const searchObject = {
                name: searchTerm
            }
            if(req.user.role === 'customer') {
                searchObject.status = 'approved';
                searchObject.quantity = { $gt: 0 };
            }
            if(req.query.firstSearch) {
                const results = await Product.find(searchObject)
                                             .sort('createdAt', -1);
                const products = [];
                const limit = req.query.limit ? req.query.limit : 10;
                for( let i = 0; i < limit; i++ ) {
                    products.push(results[i]);
                }
                res.status(200).send({ products, totalResults: results.length });
            } else {
                const offset = (req.query.pageNo - 1)*req.query.limit;
                const limit = req.query.limit ? req.query.limit : 10;
                const products = await Product.find(searchObject)
                                              .sort('createdAt', -1)
                                              .skip(offset)
                                              .limit(limit);
                res.status(200).send({ products });
            }
        } catch(e) {
            res.status(503).send({ error: 'Unable to perform search right now!' })
        }
    } else {
        res.status(400).send({ error: 'You cannot search as a seller!' });
    }
})

module.exports = router