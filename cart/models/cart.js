const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
    _id: false,
    code: {
        type: String
    },
    discountPercentage: {
        type: Number,
        minimum: 10,
        maximum: 90
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sellerName: {
        type: String
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    productName: {
        type: String
    }
})

const productSchema = new mongoose.Schema({
    _id: false,
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product'
    },
    quantity: {
        type: Number,
        required: true,
        minimum: 1
    },
    ordered: {
        type: Boolean,
        default: false
    },
    coupon: [couponSchema]
})

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    products: [productSchema]
}, {
    timestamps: true
})

const Cart = mongoose.model('Cart', cartSchema)

module.exports = Cart