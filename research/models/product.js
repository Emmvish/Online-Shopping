const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    price: {
        type: Number,
        required: true,
        minimum: 1
    },
    rating: {
        type: Number,
        default: 0,
        maximum: 5,
        minimum: 0
    },
    totalRatings: {
        type: Number,
        default: 0,
        minimum: 0
    },
    quantity: {
        type: Number,
        default: 0,
        minimum: 0
    },
    status: {
        type: String,
        default: 'pending',
        validate(value) {
            const statuses = ['pending', 'approved', 'rejected']
            if(!statuses.includes(value)){
                throw new Error('Invalid status!')
            }
        }
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
}, {
    timestamps: true
})

const Product = mongoose.model('Product', productSchema)

module.exports = Product