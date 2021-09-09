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
    createdAt: {
        type: Date,
        default: Date.now()
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
})

// userSchema.methods.toJSON = function () {
//     const user = this
//     const userObject = user.toObject()
//     delete userObject.tokens

//     return userObject
// }

// userSchema.index({ name: 'text' })

const User = mongoose.model('User', userSchema)

module.exports = User