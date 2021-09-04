const request = require('supertest')
const User = require('../models/user')
const app = require('../index')
const { userOne, userTwo, userThree, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should obtain payout value for seller', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userTwo.tokens[0].token}`).post('/payout').send().expect(201);
    expect(response.body.monthlyEarnings).toBe(0);
})

test('Should NOT obtain payout value for non-seller', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).post('/payout').send().expect(400);
    expect(response.body).toMatchObject({ error: 'This user is NOT a seller!' })
})

test('Should reset monthlyEarnings of all sellers as an admin', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userOne.tokens[0].token}`).post('/payout/reset').send().expect(201);
    const users = await User.find({ role: 'seller', monthlyEarnings: { $gt: 0 } })
    expect(users.length).toBe(0);
    expect(response.body).toMatchObject({ message: 'Monthly Earnings of all retailers have been reset.' })
})

test('Should NOT reset monthlyEarnings of all sellers as a non-admin', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).post('/payout/reset').send().expect(400);
    const users = await User.find({ role: 'seller', monthlyEarnings: { $gt: 0 } })
    expect(users.length).not.toBe(0);
    expect(response.body).toMatchObject({ error: 'This user is NOT an admin!' })
})