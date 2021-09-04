const jwt = require('jsonwebtoken')
const User = require('../models/user')

const authAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, 'Some-Secret-Key')
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