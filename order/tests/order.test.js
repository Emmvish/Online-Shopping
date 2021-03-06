const request = require('supertest')
const app = require('../index')
const Order = require('../models/order')
const { userOne, userTwoId, userTwo, userThree, userThreeId, userFour, productOneId, productTwoId, productThreeId, orderOne, orderOneId, setupDatabase } = require('./fixtures/db')

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
    await request(app).post('/order').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productThreeId,
            quantity: 2
        }
    }).expect(201);
    const order = await Order.findOne({ userId: userThreeId, productId: productThreeId })
    expect(order).not.toBeNull();
})

test('Should allow customers to avail discount using a coupon code', async () => {
    await request(app).post('/order').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            quantity: 2
        },
        coupon: {
            code: 'ILOVESJ'
        }
    }).expect(201);
    const orders = await Order.find({ userId: userThreeId, productId: productOneId })
    expect(orders[1].totalValue).toBe(80);
})

test('Should NOT allow discount code of one product to be applied onto another', async () => {
    const response = await request(app).post('/order').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productThreeId,
            quantity: 2
        },
        coupon: {
            code: 'ILOVESJ'
        }
    }).expect(404);
    expect(response.body.error).toBe('Invalid Coupon!')
})

test('Should NOT allow customer to use invalid discount code', async () => {
    const response = await request(app).post('/order').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            quantity: 2
        },
        coupon: {
            code: 'BLABLABLA'
        }
    }).expect(404);
    expect(response.body.error).toBe('Invalid Coupon!')
})

test('Should allow sellers to edit status of their order', async () => {
    await request(app).patch('/order/edit').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        order: {
            _id: orderOneId,
            updates: { status: 'delivered' }
        }
    }).expect(201);
    const order = await Order.findOne({ _id: orderOneId })
    expect(order.status).toBe('delivered');
})

test('Should NOT allow a seller to edit order of another seller', async () => {
    const response = await request(app).patch('/order/edit').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
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
    const response = await request(app).patch('/order/edit').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
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
    const response = await request(app).patch('/order/edit').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        order: {
            _id: orderOneId,
            updates: { sellerId: userTwoId }
        }
    }).expect(404);
    const order = await Order.findOne({ _id: orderOneId })    
    expect(order.sellerId.toString()).toBe(orderOne.sellerId.toString())
    expect(response.body).toMatchObject({ error: 'Invalid updates!' })
})

test('Should allow a customer to fetch first page of their orders', async () => {
    const response = await request(app).get('/order/all').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({ firstSearch: true }).expect(200);
    expect(response.body.orders.length).toBe(2);
    expect(response.body.orders[1].sellerName).toBe('Mike');
    expect(response.body.orders[0].sellerName).toBe('Hamilton');
})

test('Should allow a seller to fetch first page of their orders', async () => {
    const response = await request(app).get('/order/all').set('Authorization', `Bearer ${userOne.tokens[0].token}`).query({ firstSearch: true }).expect(200);
    expect(response.body.orders.length).toBe(1);
    expect(response.body.orders[0].customerName).toBe('Manish')
})

test('Should allow a user to fetch first page of their cancelled orders', async () => {
    const response = await request(app).get('/order/all').set('Authorization', `Bearer ${userOne.tokens[0].token}`).query({ firstSearch: true, status: 'cancelled' }).expect(200);
    expect(response.body.orders.length).toBe(1);
    expect(response.body.orders[0].productName).toBe('Spoon')
})

test('Should allow a user to fetch first page of their pending orders', async () => {
    const response = await request(app).get('/order/all').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).query({ firstSearch: true, status: 'pending' }).expect(200);
    expect(response.body.orders.length).toBe(1);
    expect(response.body.orders[0].productName).toBe('Milton Jar')
})

test('Should NOT fetch an order if its status is found to be invalid', async () => {
    const response = await request(app).get('/order/all').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).query({ firstSearch: true, status: 'abc' }).expect(503);
    expect(response.body.error).toBe('Invalid Order Status!')
})

test('Should NOT allow an admin to fetch orders', async () => {
    const response = await request(app).get('/order/all').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({ firstSearch: true }).expect(400);
    expect(response.body).toMatchObject({ error: 'This user is neither a seller nor a customer!' })
})