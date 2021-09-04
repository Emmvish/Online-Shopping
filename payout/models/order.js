const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
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
    totalValue: {
        type: Number,
        required: true,
        minimum: 1
    },
    status: {
        type: String,
        validate(value) {
            const statuses = ['pending','shipped','delivered','cancelled'];
            if(!statuses.includes(value)){
                throw new Error();
            }
        }
    }
}, {
    timestamps: true
})

const Order = mongoose.model('Order', orderSchema)

module.exports = Order