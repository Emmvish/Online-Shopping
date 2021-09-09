const jwt = require('jsonwebtoken')
const User = require('../models/user')

const authAdmin = async (req, res, next) => {
    try {
        if(!req.header('Authorization')) {
            throw new Error('Please supply an authentication token!')
        }
        const token = req.header('Authorization').replace('Bearer ', '')
        const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'
        const decoded = jwt.verify(token, jwtSecret)
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })

        if (!user || user.role !== 'admin') {
            throw new Error('Such request can only be entertained for site admins.')
        }

        if(user.name === req.body.currentName){
            req.user = user
            next()
        } else {
            try {
                const userToEdit = await User.findOne({ name: req.body.currentName })
                if(userToEdit){
                    req.user = userToEdit;
                    next()
                } else {
                    throw new Error()
                }
            } catch(e){
                res.status(404).send({error: 'Requested User was NOT found!'});
            }
        }
    } catch (e) {
        res.status(401).send({error: e.message});
    }
}

module.exports = authAdmin