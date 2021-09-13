const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../../models/user')
const Product = require('../../models/product')
const Cart = require('../../models/cart')

const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'

const productFourId = new mongoose.Types.ObjectId()

const userOneId = new mongoose.Types.ObjectId()
const userOne = {
    _id: userOneId,
    name: 'Mike',
    email: 'mike@example.com',
    role: 'seller',
    address: 'New York',
    tokens: [{
        token: jwt.sign({ _id: userOneId }, jwtSecret)
    }],
    coupons: [{
        productId: productFourId,
        productName: 'T-shirt',
        sellerId: userOneId,
        sellerName: 'Mike',
        code: 'MIKE20',
        discountPercentage: 20
    }]
}

const userTwoId = new mongoose.Types.ObjectId()
const userTwo = {
    _id: userTwoId,
    name: 'Hamilton',
    email: 'hamilton@example.com',
    role: 'seller',
    address: 'Berlin',
    tokens: [{
        token: jwt.sign({ _id: userTwoId }, jwtSecret)
    }], 
    coupons: [{
        sellerId: userTwoId,
        sellerName: 'Hamilton',
        code: 'HAMILTON20',
        discountPercentage: 20
    }]
}

const userThreeId = new mongoose.Types.ObjectId()
const userThree = {
    _id: userThreeId,
    name: 'Manish',
    email: 'mvsnsss@example.com',
    role: 'customer',
    address: 'Delhi',
    tokens: [{
        token: jwt.sign({ _id: userThreeId }, jwtSecret)
    }], 
    coupons: [{
        sellerId: userTwoId,
        sellerName: 'Hamilton',
        code: 'HAMILTON20',
        discountPercentage: 20
    }, {
        productId: productFourId,
        productName: 'T-shirt',
        sellerId: userOneId,
        sellerName: 'Mike',
        code: 'MIKE20',
        discountPercentage: 20
    }]
}

const userFourId = new mongoose.Types.ObjectId()
const userFour = {
    _id: userFourId,
    name: 'SJ',
    email: 'sjish@example.com',
    role: 'customer',
    address: 'Kolkata',
    tokens: [{
        token: jwt.sign({ _id: userFourId }, jwtSecret)
    }]
}

const productOneId = new mongoose.Types.ObjectId()
const productOne = {
    _id: productOneId,
    name: 'Milton Jar',
    price: 50,
    quantity: 5,
    status: 'approved',
    sellerId: userTwoId
}

const productTwoId = new mongoose.Types.ObjectId()
const productTwo = {
    _id: productTwoId,
    name: 'Milton Dildo',
    price: 25,
    quantity: 3,
    status: 'rejected',
    sellerId: userTwoId
}

const productThreeId = new mongoose.Types.ObjectId()
const productThree = {
    _id: productThreeId,
    name: 'Spoon',
    price: 35,
    quantity: 0,
    status: 'approved',
    sellerId: userOneId
}

const productFour = {
    _id: productFourId,
    name: 'T-shirt',
    price: 40,
    quantity: 50,
    status: 'approved',
    sellerId: userOneId
}

const cartOneId = new mongoose.Types.ObjectId()
const cartOne = {
    _id: cartOneId,
    userId: userThreeId,
    products: [
        { productId: productOneId, quantity: 1, ordered: false, coupon: [{
            productId: productOneId,
            productName: 'Milton Jar',
            sellerId: userTwoId,
            sellerName: 'Hamilton',
            code: 'HAMILTON20',
            discountPercentage: 20
         }] },
        { productId: productFourId, quantity: 1, ordered: false }
    ]
}

const cartTwoId = new mongoose.Types.ObjectId()
const cartTwo = {
    _id: cartTwoId,
    userId: userFourId,
    products: [
        { productId: productOneId, 
          quantity: 100, 
          ordered: false,
        }
    ]
}

const setupDatabase = async () => {
    await User.deleteMany()
    await Product.deleteMany()
    await Cart.deleteMany()
    await new User(userOne).save()
    await new User(userTwo).save()
    await new User(userThree).save()
    await new User(userFour).save()
    await new Product(productOne).save()
    await new Product(productTwo).save()
    await new Product(productThree).save()
    await new Product(productFour).save()
    await new Cart(cartOne).save()
    await new Cart(cartTwo).save()
}

module.exports = {
    userOneId,
    userOne,
    userTwoId,
    userTwo,
    userThreeId,
    userThree,
    userFour,
    productOneId,
    productOne,
    productTwoId,
    productTwo,
    productThreeId,
    productThree,
    cartOne,
    cartOneId,
    cartTwo,
    cartTwoId,
    productFourId,
    setupDatabase
}