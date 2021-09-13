const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../index')
const User = require('../models/user')
const { userTwo, userThree, userFour, setupDatabase, userTwoId, productOneId, userFourId, productTwoId, productThreeId } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should add a coupon created by a seller to all customers in system', async () => {
    const code = 'DISCOUNT'
    const response = await request(app).post('/coupons/add').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            productId: productOneId,
            code,
            discountPercentage: 20
        }
    }).expect(201);
    expect(response.body.message).toBe("Coupon has been added!")
    const seller = await User.findOne({ _id: userTwoId })
    expect(seller.coupons[1].code).toBe(code);
    const customers = await User.find({ role: 'customer' });
    customers.forEach((customer)=>{
        expect(customer.coupons[2].code).toBe(code);
    })
})

test('Should NOT allow non-seller to add a coupon to customer inventory', async () => {
    const response = await request(app).post('/coupons/add').set('Authorization', `Bearer ${userFour.tokens[0].token}`).send({
        coupon: {
            productId: productOneId,
            code: 'XYZABC',
            discountPercentage: 20
        }
    }).expect(400);
    expect(response.body.error).toBe("You can only make this request as a seller!");
})

test('Should NOT allow seller to add a coupon with less than 10% discount', async () => {
    const response = await request(app).post('/coupons/add').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            productId: productOneId,
            code: 'XYZABC',
            discountPercentage: 8
        }
    }).expect(404);
    expect(response.body.error).toBe('Discount Percentage should be between 10 and 90.')
})

test('Should NOT allow seller to add a coupon with more than 90% discount', async () => {
    const response = await request(app).post('/coupons/add').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            productId: productOneId,
            code: 'XYZABC',
            discountPercentage: 100
        }
    }).expect(404);
    expect(response.body.error).toBe('Discount Percentage should be between 10 and 90.')
})

test('Should NOT allow seller to create another coupon having same code', async () => {
    const response = await request(app).post('/coupons/add').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            code: 'ILOVESJ',
            discountPercentage: 20
        }
    }).expect(404);
    expect(response.body.error).toBe('This coupon already exists!');
})

test('Should NOT allow seller to create a coupon for non-existing product', async () => {
    const response = await request(app).post('/coupons/add').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            code: 'AXBD',
            productId: new mongoose.Types.ObjectId(),
            discountPercentage: 20
        }
    }).expect(404);
    expect(response.body.error).toBe('Product was NOT found in the database');
})

test('Should NOT allow seller to add a coupon for a rejected product', async () => {
    const response = await request(app).post('/coupons/add').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            productId: productTwoId,
            code: 'ABCXYZ',
            discountPercentage: 20
        }
    }).expect(404);
    expect(response.body.error).toBe("Product was NOT found in the database");
})

test('Should NOT allow seller to add a coupon for product that does not belong to them', async () => {
    const response = await request(app).post('/coupons/add').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            productId: productThreeId,
            code: 'WHATEVER',
            discountPercentage: 20
        }
    }).expect(404);
    expect(response.body.error).toBe("Product was NOT found in the database");
    const seller = await User.findOne({ _id: userTwoId })
    expect(seller.coupons.length).toBe(1);
    expect(seller.coupons[0].code).toBe('ILOVESJ')
})

test('Should allow seller to delete a coupon', async () => {
    const response = await request(app).delete('/coupons/delete').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            code: 'ILOVESJ'
        }
    }).expect(200);
    expect(response.body.message).toBe("Coupon has been removed!")
    const seller = await User.findOne({ _id: userTwoId })
    expect(seller.coupons.length).toBe(0);
    const customers = await User.find({ role: 'customer' })
    customers.forEach((customer)=>{
        expect(customer.coupons.length).toBe(1)
    })
})

test('Should NOT allow non-seller to delete a coupon', async () => {
    const response = await request(app).delete('/coupons/delete').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        coupon: {
            code: 'ILOVESJ'
        }
    }).expect(400);
    expect(response.body.error).toBe("You can only make this request as a seller!")
})

test('Should NOT allow seller to delete a coupon on a non-existing product', async () => {
    const response = await request(app).delete('/coupons/delete').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            productId: new mongoose.Types.ObjectId(),
            code: 'ILOVESJ'
        }
    }).expect(404);
    expect(response.body.error).toBe('Product was NOT found in the database')
})

test('Should allow a customer to view all of their coupons', async ()=>{
    const response = await request(app).get('/coupons/view').set('Authorization', `Bearer ${userThree.tokens[0].token}`).expect(200);
    expect(response.body.coupons.length).toBe(2);
})

test('Should allow a seller to view all of their coupons', async ()=>{
    const response = await request(app).get('/coupons/view').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).expect(200);
    expect(response.body.coupons.length).toBe(1);
})

test('Should NOT allow an admin to view any coupons', async ()=>{
    const response = await request(app).get('/coupons/view').set('Authorization', `Bearer ${userFour.tokens[0].token}`).expect(400);
    expect(response.body.error).toBe("You can only make this request as a seller or a customer!");
})