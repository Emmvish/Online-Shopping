const express = require('express');

const User = require('../models/user')
const Product = require('../models/product')

const auth = require('../middleware/auth')

const router = new express.Router()

router.post('/search', auth, async (req, res) => {
    if(req.user.role === 'customer' || req.user.role === 'admin') {
        try {
            const searchTerm = "/" + req.body.searchTerm + "/i";
            const users = await User.find({ name: searchTerm, role: 'seller' }, { name: 1, role: 1, address: 1, email: 1 });
            const products = await Product.find({ name: searchTerm, status: 'approved', quantity: { $gt: 0 } });
            res.status(200).send({ users, products });
        } catch(e) {
            res.status(503).send({ error: 'Unable to perform search right now!' })
        }
    } else {
        res.status(400).send({ error: 'You cannot search as a seller!' });
    }
})

module.exports = router