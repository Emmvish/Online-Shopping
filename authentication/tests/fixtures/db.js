const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../../models/user')

const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'

const userOneId = new mongoose.Types.ObjectId()
const userOne = {
    _id: userOneId,
    name: 'Mike',
    email: 'mike@example.com',
    password: '56what!!',
    role: 'customer',
    address: 'New York',
    tokens: [{
        token: jwt.sign({ _id: userOneId }, jwtSecret)
    }]
}

const userTwoId = new mongoose.Types.ObjectId()
const userTwo = {
    _id: userTwoId,
    name: 'Jess',
    email: 'jess@example.com',
    password: 'myhouse099@@',
    role: 'admin',
    address: 'Berlin',
    tokens: [{
        token: jwt.sign({ _id: userTwoId }, jwtSecret)
    }]
}

const setupDatabase = async () => {
    await User.deleteMany()
    await new User(userOne).save()
    await new User(userTwo).save()
}

module.exports = {
    userOneId,
    userOne,
    userTwoId,
    userTwo,
    setupDatabase
}