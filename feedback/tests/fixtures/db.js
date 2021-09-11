const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../../models/user')
const Product = require('../../models/product')
const Feedback = require('../../models/feedback')

const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'

const userOneId = new mongoose.Types.ObjectId()
const userOne = {
    _id: userOneId,
    name: 'Mike',
    email: 'mike@example.com',
    role: 'seller',
    address: 'New York',
    tokens: [{
        token: jwt.sign({ _id: userOneId }, jwtSecret)
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
    }]
}

const userFourId = new mongoose.Types.ObjectId()
const userFour = {
    _id: userFourId,
    name: 'Man',
    email: 'man@example.com',
    role: 'admin',
    address: 'Delhi',
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
    sellerId: userTwoId,
    complaints: [{
        userId: userThreeId,
        username: 'Manish',
        message: 'Bad Product!'
    }]
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

const feedbackId = new mongoose.Types.ObjectId();
const feedback = {
    _id: feedbackId,
    userId: userThreeId,
    message: 'Nice Website!'
}

const setupDatabase = async () => {
    await User.deleteMany()
    await Product.deleteMany()
    await Feedback.deleteMany()
    await new User(userOne).save()
    await new User(userTwo).save()
    await new User(userThree).save()
    await new User(userFour).save()
    await new Product(productOne).save()
    await new Product(productTwo).save()
    await new Product(productThree).save()
    await new Feedback(feedback).save()
}

module.exports = {
    userOneId,
    userOne,
    userTwoId,
    userTwo,
    userThreeId,
    userThree,
    userFour,
    userFourId,
    productOneId,
    productOne,
    productTwoId,
    productTwo,
    productThreeId,
    productThree,
    feedback,
    feedbackId,
    setupDatabase
}