const mongoose = require('mongoose')
const validator = require('validator')

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error('Please Enter a Valid E-mail Address!')
            }
        }
    },
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    role: {
        type: String,
        required: true,
        validate(value) {
            const roles = ['customer','admin','seller'];
            if(!roles.includes(value)) {
                throw new Error('Invalid Role!')
            }
        }
    },
    address: {
        type: String,
        required: true
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    coupons: [{
        code: {
            type: String,
            unique: true,
            required: true
        },
        discountPercentage: {
            type: Number,
            minimum: 10,
            maximum: 100,
            required: true
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        productName: {
            type: String
        },
        sellerName: {
            type: String,
            required: true
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
    }]
}, {
    timestamps: true
})

const User = mongoose.model('User', userSchema)

module.exports = User