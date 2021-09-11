const mongoose = require('mongoose')

const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    message: {
        type: String,
        required: true
    }
}, {
    timestamps: true
})

const Feedback = mongoose.model('Feedback', feedbackSchema)

module.exports = Feedback