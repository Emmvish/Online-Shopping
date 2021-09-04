const request = require('supertest')
const app = require('../index')
const { userTwoId, userTwo, userThree, productOneId, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should fetch the list of desired sellers and items for customer', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).post('/search').send({
        searchTerm: 'milton'
    }).expect(200);
    expect(response.body).toMatchObject({ users: [{ _id: userTwoId, name: 'Hamilton', email: 'hamilton@example.com', role: 'seller', address: 'Berlin' }], 
    products: [{_id: productOneId, name: 'Milton Jar', price: 50, quantity: 5, status: 'approved', ratings: 0, totalRatings: 0, sellerId: userTwoId}] })
})

test('Should NOT fetch the list of desired sellers and items for sellers', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userTwo.tokens[0].token}`).post('/search').send({
        searchTerm: 'milton'
    }).expect(400);
    expect(response.body).toMatchObject({ error: 'You cannot search as a seller!' })
});