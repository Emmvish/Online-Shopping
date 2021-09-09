const express = require('express');

const auth = require('../middleware/auth')
const User = require('../models/user')

const router = new express.Router()

router.post('/payout', auth, async (req, res) => {
    if(req.user.role === 'seller') {
        res.status(201).send({ monthlyEarnings: req.user.monthlyEarnings });
    } else {
        res.status(400).send({ error: 'This user is NOT a seller!' })
    }
})

router.post('/payout/reset', auth, async (req, res) => {
    if(req.user.role === 'admin') {
        await User.updateMany({ role: 'seller' }, { $set: { monthlyEarnings: 0 } })
        res.status(201).send({ message: 'Monthly Earnings of all retailers have been reset.' })
    } else {
        res.status(400).send({ error: 'This user is NOT an admin!' })
    }
})

module.exports = router