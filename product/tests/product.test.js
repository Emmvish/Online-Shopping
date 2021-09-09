const request = require('supertest')
const app = require('../index')
const Product = require('../models/product')
const { userOne, userTwoId, userTwo, userThree, userThreeId, productOne, productOneId, productTwo, productTwoId, productThreeId, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should add a new product for the seller', async () => {
    const response = await request(app).post('/products/add').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        product: {
            name: 'Peta Jar',
            price: 500,
            quantity: 10
        }
    }).expect(201);
    const product = await Product.findOne({ sellerId: userTwoId, name: 'Peta Jar' })
    expect(product).not.toBeNull();
})

test('Should NOT add a new product for a non-seller', async () => {
    const response = await request(app).post('/products/add').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            name: 'Peta Jar',
            price: 500,
            quantity: 10
        }
    }).expect(400);
    const product = await Product.findOne({ sellerId: userThreeId, name: 'Peta Jar' })
    expect(product).toBeNull();
    expect(response.body).toMatchObject({ error: 'This user is NOT a seller!' })
})

test('Should delete existing product that was put on sale by a seller', async () => {
    await request(app).post('/products/delete').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        product: {
            _id: productThreeId
        }
    }).expect(200);
    const product = await Product.findOne({ _id: productThreeId })
    expect(product).toBeNull();
})

test('Should not allow one seller to delete product of another seller', async () => {
    const response = await request(app).post('/products/delete').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        product: {
            _id: productTwoId
        }
    }).expect(404);
    const product = await Product.findOne({ _id: productTwoId })
    expect(product).not.toBeNull();
    expect(response.body).toMatchObject({ error: 'This product does NOT exist in the database!' })
})

test('Should not allow a non-seller to delete any products', async () => {
    const response = await request(app).post('/products/delete').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId
        }
    }).expect(400);
    const product = await Product.findOne({ _id: productOneId })
    expect(product).not.toBeNull();
    expect(response.body).toMatchObject({ error: 'This user is NOT a seller!' })
})

test('Should not allow a non-seller edit a product', async () => {
    const response = await request(app).post('/products/edit').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            updates: { name: 'test' }
        }
    }).expect(400);
    const product = await Product.findOne({ _id: productOneId })
    expect(product.name).toBe(productOne.name);
    expect(response.body).toMatchObject({ error: 'This user is NOT a seller!' })
})

test('Should not allow one seller to edit a product of another seller', async () => {
    const response = await request(app).post('/products/edit').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        product: {
            _id: productTwoId,
            updates: { name: 'test' }
        }
    }).expect(404);
    const product = await Product.findOne({ _id: productTwoId })
    expect(product.name).toBe(productTwo.name)
    expect(response.body).toMatchObject({ error: 'This product does NOT exist in the database!' })
})

test('Should not edit an invalid field for any product, as a seller', async () => {
    const response = await request(app).post('/products/edit').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        product: {
            _id: productTwoId,
            updates: { rating: 4.5 }
        }
    }).expect(404);
    const product = await Product.findOne({ _id: productTwoId })
    expect(product.rating).toBe(0);
    expect(response.body).toMatchObject({ error: 'Invalid updates!' })
})

test('Should allow seller to edit valid fields of their products', async () => {
    const response = await request(app).post('/products/edit').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        product: {
            _id: productThreeId,
            updates: { name: 'test' }
        }
    }).expect(200)
    const product = await Product.findOne({ _id: productThreeId })
    expect(product.name).toBe('test');
})

test('Should allow seller to view first page of their own products', async () => {
    const response = await request(app).get('/products').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).query({ firstSearch: true }).expect(201);
    const { products, totalResults } = response.body;
    expect(products.length).toBe(2);
    expect(totalResults).toBe(2);
})

test('Should allow seller to view second page of their own products', async () => {
    const response = await request(app).get('/products').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).query({ firstSearch: false, pageNo: 2, limit: 1 }).expect(201);
    const { products } = response.body;
    expect(products.length).toBe(1);
})

test('Should NOT allow non-sellers to use /products endpoint', async () => {
    const response = await request(app).get('/products').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({ firstSearch: true }).expect(400);
    expect(response.body).toMatchObject({ error: 'This user is NOT a seller!' })
})

test('Should allow customer to rate a product', async () => {
    const response = await request(app).post('/products/rate').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            rating: 4
        }
    }).expect(201);
    expect(response.body.product.rating).toBe(4)
})

test('Should NOT allow seller to rate a product', async () => {
    const response = await request(app).post('/products/rate').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            rating: 4
        }
    }).expect(400);
    expect(response.body).toMatchObject({ error: 'This user is NOT a customer!' })
})

test('Should NOT allow customer to rate a rejected product', async () => {
    const response = await request(app).post('/products/rate').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productTwoId,
            rating: 4
        }
    }).expect(404);
    expect(response.body).toMatchObject({ error: 'This product does NOT exist in the database!' })
    const product = await Product.findOne({ _id: productTwoId });
    expect(product.rating).toBe(0);
})