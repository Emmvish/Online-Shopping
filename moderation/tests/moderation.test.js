const request = require('supertest')
const app = require("../index")

const { userOneId, userOne, userTwoId, userTwo, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should Reject the Product', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { token: userTwo.tokens[0].token, name: 'Ass Opener', status: 'pending'} }).expect(200);
    expect(response.body).toMatchObject({
        type: 'ProductModerated',
        data: {
            token: userTwo.tokens[0].token,
            name: 'Ass Opener',  
            status: 'rejected'
        }
    })
})

test('Should Approve the Product', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { token: userTwo.tokens[0].token, name: 'Smartphone', status: 'pending'} }).expect(200);
    expect(response.body).toMatchObject({
        type: 'ProductModerated',
        data: {
            token: userTwo.tokens[0].token,
            name: 'Smartphone',
            status: 'approved'
        }
    })
})

test('Should NOT moderate if user is a customer', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { token: userOne.tokens[0].token, name: 'Smartphone', status: 'pending'} }).expect(401);
    expect(response.body).toMatchObject({ error: 'User was not found in the database!' })
})

test('Should NOT moderate if user is not authenticated', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { name: 'Smartphone', status: 'pending'} }).expect(401);
    expect(response.body).toMatchObject({ error: 'User was not found in the database!' })
})