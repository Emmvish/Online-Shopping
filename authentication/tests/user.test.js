const request = require('supertest')
const app = require('../index')
const User = require('../models/user')
const { userOneId, userOne, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should login existing user', async () => {
    const response = await request(app).post('/auth/login').send({
        name: userOne.name,
        password: userOne.password
    }).expect(200)
    const user = await User.findById(userOneId)
    expect(response.body.token).toBe(user.tokens[1].token)
})

test('Should not login nonexistent user', async () => {
    await request(app).post('/auth/login').send({
        name: userOne.name,
        password: 'adifferentpassword'
    }).expect(404)
})

test('Should log out the user', async () => {
    await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)
    const user = await User.findById(userOneId);
    expect(user.tokens.length).toBe(0)
})