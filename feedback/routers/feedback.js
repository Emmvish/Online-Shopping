const express = require('express');

const Feedback = require('../models/feedback')
const Product = require('../models/product')

const auth = require('../middleware/auth')
const checkProduct = require('../middleware/product');

const router = new express.Router()

router.post('/feedback/submit', auth, async (req, res) => {
    if(req.user.role === 'customer' || req.user.role === 'seller') {
        try {
            req.body.feedback.userId = req.user._id;
            const feedback = new Feedback(req.body.feedback);
            await feedback.save();
            res.status(201).send({ message: 'Your feedback has been submitted!' });
        } catch(e) {
            res.status(503).send({ error: 'Unable to submit feedback right now!' })
        }
    } else {
        res.status(400).send({ error: 'You cannot provide feedback as an admin!' });
    }
})

router.get('/feedback/list', auth, async (req, res) => {
    if(req.user.role === 'admin') {
        try {
            if(req.query.firstSearch === 'true') {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const feedbackList = await Feedback.find({ }).sort({ createdAt: -1 });
                const results = [];
                for( i = 0; i < limit; i++ ) {
                    if(feedbackList[i]) {
                        results.push(feedbackList[i]);
                    }
                }
                res.status(200).send({ feedbacks: results, totalResults: feedbackList.length });
            } else {
                const offset = (req.query.pageNo - 1)*req.query.limit;
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const feedbackList = await Feedback.find({ })
                                                   .sort({ createdAt: -1 })
                                                   .skip(offset)
                                                   .limit(limit);
                res.status(200).send({ feedbacks: feedbackList });
            }
        } catch(e) {
            res.status(503).send({ error: 'Unable to fetch the feedback messages!' })
        }
    } else {
        res.status(400).send({ error: 'You can only use this feature as an admin!' });
    }
})

router.post('/feedback/submitComplaint', auth, checkProduct, async (req, res) => {
    if(req.user.role === 'customer') {
        try {
            const complaint = {
                userId: req.user._id,
                username: req.user.name,
                message: req.body.complaint.message
            }
            req.product.complaints.push(complaint);
            await req.product.save();
            res.status(201).send({ message: 'Your complaint has been recorded!' })
        } catch(e) {
            res.status(503).send({ error: 'Unable to submit the complaint!' })
        }
    } else {
        res.status(400).send({ error: 'You can only use this feature as a customer!' });
    }
})

router.get('/feedback/complaints', auth, async (req, res) => {
    if(req.user.role === 'seller'  || req.user.role === 'admin') {
        try {
            const sellerId = req.user.role === 'seller' ? req.user._id : req.query.sellerId;
            if(req.query.firstSearch === 'true') {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                let productList = await Product.find({ sellerId }).sort({ createdAt: -1 })
                const results = [];
                for( i = 0; i < limit; i++ ) {
                    if(productList[i] && productList[i].complaints.length > 0) {
                        results.push(productList[i]);
                    }
                }
                res.status(200).send({ complaints: results, totalResults: productList.length });
            } else {
                const offset = (req.query.pageNo - 1)*req.query.limit;
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                let productList = await Product.find({ sellerId })
                                                   .sort({ createdAt: -1 })
                                                   .skip(offset)
                                                   .limit(limit);
                productList = productList.filter((product) => product.complaints.length > 0);
                res.status(200).send({ complaints: productList });
            }
        } catch(e) {
            res.status(503).send({ error: 'Unable to fetch your products and complaints!' })
        }
    } else {
        res.status(400).send({ error: 'You can only use this feature as a seller!' });
    }
})

module.exports = router