const request = require('supertest')
const app = require('../index')
const Order = require('../models/order')
const { userOne, userTwoId, userTwo, userThree, userThreeId, userFour, productTwoId, productThreeId, orderOne, orderOneId, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should NOT allow non-customers to place an order', async () => {
    const response = await request(app).post('/order').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        product: {
            _id: productThreeId,
            quantity: 2
        }
    }).expect(400);
    const order = await Order.findOne({ userId: userTwoId, productId: productThreeId })
    expect(order).toBeNull();
    expect(response.body).toMatchObject({ error: 'This user is NOT a customer!' })
})

test('Should NOT allow customers to order rejected products', async () => {
    const response = await request(app).post('/order').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productTwoId,
            quantity: 2
        }
    }).expect(404);
    const order = await Order.findOne({ userId: userThreeId, productId: productTwoId })
    expect(order).toBeNull();
    expect(response.body).toMatchObject({ error: 'Product was not found!' })
})

test('Should allow customers to order approved products', async () => {
    const response = await request(app).post('/order').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productThreeId,
            quantity: 2
        }
    }).expect(201);
    const order = await Order.findOne({ userId: userThreeId, productId: productThreeId })
    expect(order).not.toBeNull();
})

test('Should allow sellers to edit status of their order', async () => {
    await request(app).post('/order/edit').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        order: {
            _id: orderOneId,
            updates: { status: 'delivered' }
        }
    }).expect(201);
    const order = await Order.findOne({ _id: orderOneId })
    expect(order.status).toBe('delivered');
})

test('Should NOT allow a seller to edit order of another seller', async () => {
    const response = await request(app).post('/order/edit').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        order: {
            _id: orderOneId,
            updates: { status: 'delivered' }
        }
    }).expect(404);
    const order = await Order.findOne({ _id: orderOneId })
    expect(order.status).toBe(orderOne.status);
    expect(response.body).toMatchObject({ error: 'This order does NOT exist!' })
})

test('Should NOT allow a non-seller to edit any order', async () => {
    const response = await request(app).post('/order/edit').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        order: {
            _id: orderOneId,
            updates: { status: 'delivered' }
        }
    }).expect(400);
    const order = await Order.findOne({ _id: orderOneId })
    expect(order.status).toBe(orderOne.status);
    expect(response.body).toMatchObject({ error: 'This user is NOT a seller!' })
})

test('Should NOT allow a seller to update any property other than status of their order', async () => {
    const response = await request(app).post('/order/edit').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        order: {
            _id: orderOneId,
            updates: { sellerId: userTwoId }
        }
    }).expect(404);
    const order = await Order.findOne({ _id: orderOneId })    
    expect(order.sellerId.toString()).toBe(orderOne.sellerId.toString())
    expect(response.body).toMatchObject({ error: 'Invalid updates!' })
})

test('Should allow a customer to fetch all of their orders', async () => {
    const response = await request(app).post('/order/all').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send().expect(200);
    expect(response.body.orders.length).toBe(1);
})

test('Should allow a seller to fetch all of their orders', async () => {
    const response = await request(app).post('/order/all').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send().expect(200);
    expect(response.body.orders.length).toBe(1);
})

test('Should NOT allow an admin to fetch orders', async () => {
    const response = await request(app).post('/order/all').set('Authorization', `Bearer ${userFour.tokens[0].token}`).send().expect(400);
    expect(response.body).toMatchObject({ error: 'This user is neither a seller nor a customer!' })
})