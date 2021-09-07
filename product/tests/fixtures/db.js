const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../../models/user')
const Product = require('../../models/product')

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
        token: jwt.sign({ _id: userTwoId }, jwtSecret)
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

const setupDatabase = async () => {
    await User.deleteMany()
    await new User(userOne).save()
    await new User(userTwo).save()
    await new User(userThree).save()
    await new Product(productOne).save()
    await new Product(productTwo).save()
    await new Product(productThree).save()
}

module.exports = {
    userOneId,
    userOne,
    userTwoId,
    userTwo,
    userThreeId,
    userThree,
    productOneId,
    productOne,
    productTwoId,
    productTwo,
    productThreeId,
    productThree,
    setupDatabase
}