const request = require('supertest')
const app = require("../index")

const { userOne, userTwo, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should Reject the Product', async () => {
    await request(app).post('/events').send({ type: 'ModerateProduct', data: { token: userTwo.tokens[0].token, product: { name: 'Ass Opener', status: 'pending' } } }).expect(200);
})

test('Should Approve the Product', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { token: userTwo.tokens[0].token, product: { name: 'Smartphone', status: 'pending' } } }).expect(200);
})

test('Should NOT moderate if user is a customer', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { token: userOne.tokens[0].token, product: { name: 'Smartphone', status: 'pending' } } }).expect(401);
    expect(response.body).toMatchObject({ error: 'User was not found in the database!' })
})

test('Should NOT moderate if user is not authenticated', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { product: { name: 'Smartphone', status: 'pending' } } }).expect(401);
    expect(response.body).toMatchObject({ error: 'Token was not received!' })
})