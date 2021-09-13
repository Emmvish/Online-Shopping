const mongoose = require('mongoose')
const request = require('supertest')

const app = require('../index')
const Cart = require('../models/cart')
const User = require('../models/user')
const { userOne, userTwo, userTwoId, userThree, userThreeId, userFour, productOneId, productTwoId, cartOne, cartOneId, cartTwoId, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should add a product into the cart as a customer', async () => {
    const response = await request(app).post('/cart/editProductQuantity').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            quantity: 2
        }
    }).expect(201);
    expect(response.body.cart.products[0].productId.toString()).toBe(productOneId.toString())
    expect(response.body.cart.products[0].quantity).toBe(3)
    const cart = await Cart.findOne({ userId: userThreeId });
    expect(cart.products[0].productId.toString()).toBe(productOneId.toString())
    expect(cart.products[0].quantity).toBe(3)
})

test('Should NOT add a non-existing product into the cart of customer', async () => {
    const response = await request(app).post('/cart/editProductQuantity').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: new mongoose.Types.ObjectId(),
            quantity: 100
        }
    }).expect(404);
    expect(response.body).toMatchObject({ error: 'This product does NOT exist in the database!' });
})

test('Should NOT add a product into the cart in quantity more than available quantity, as a customer', async () => {
    const response = await request(app).post('/cart/editProductQuantity').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            quantity: 100
        }
    }).expect(404);
    expect(response.body).toMatchObject({ error: 'Sufficient quantity of this product is NOT available to meet your order!' });
})

test('Should remove existing product from cart, as a customer', async () => {
    const response = await request(app).post('/cart/editProductQuantity').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            quantity: -1
        }
    }).expect(201);
    expect(response.body.cart.products.length).toBe(1)
    const cart = await Cart.findOne({ userId: userThreeId });
    expect(cart.products.length).toBe(1)
})

test('Should NOT allow access to shopping cart for a non-customer', async () => {
    const response = await request(app).post('/cart/editProductQuantity').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        product: {
            _id: productOneId,
            quantity: 5
        }
    }).expect(400);
    expect(response.body).toMatchObject({ error: "You can only perform this operation as a customer!" })
})

test('Should remove existing product from cart, as a customer using delete route', async () => {
    const response = await request(app).delete('/cart/delete').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productOneId
        }
    }).expect(201);
    expect(response.body.cart.products.length).toBe(1)
    const cart = await Cart.findOne({ userId: userThreeId });
    expect(cart.products.length).toBe(1)
})

test('Should NOT remove non-existing product from cart, as a customer using delete route', async () => {
    const response = await request(app).delete('/cart/delete').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        product: {
            _id: productTwoId
        }
    }).expect(404);
    expect(response.body).toMatchObject({ error: 'This product was NOT found in your cart!' })
    const cart = await Cart.findOne({ userId: userThreeId });
    expect(cart.products.length).toBe(cartOne.products.length)
})

test('Should NOT remove existing product from cart, as a non-customer using delete route', async () => {
    const response = await request(app).delete('/cart/delete').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        product: {
            _id: productTwoId
        }
    }).expect(400);
    expect(response.body).toMatchObject({ error: "You can only perform this operation as a customer!" })
})

test('Should fetch products in the cart of a customer', async () => {
    const response = await request(app).get('/cart').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send().expect(200);
    expect(response.body.cart.products.length).toBe(cartOne.products.length)
})

test('Should NOT fetch products if non-customer tries to view their cart', async () => {
    const response = await request(app).get('/cart').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send().expect(400);
    expect(response.body).toMatchObject({ error: "You can only perform this operation as a customer!" })
})

test('Should place order for this customer', async () => {
    const response = await request(app).post('/cart/placeOrder').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send().expect(201);
    expect(response.body).toMatchObject({ message: 'Order Placed!' })
    const cart = await Cart.findOne({ _id: cartOneId });
    expect(cart.products.length).toBe(0);
})

test('Should NOT place order for a non-customer', async () => {
    const response = await request(app).post('/cart/placeOrder').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send().expect(400);
    expect(response.body).toMatchObject({ error: "You can only perform this operation as a customer!" })
})

test('Should NOT place order for a product which is not available in desired quantity, for a customer', async () => {
    const response = await request(app).post('/cart/placeOrder').set('Authorization', `Bearer ${userFour.tokens[0].token}`).send().expect(206);
    expect(response.body).toMatchObject({ error: 'Some of your products could NOT be ordered!' })
    const cart = await Cart.findOne({ _id: cartTwoId });
    expect(cart.products.length).not.toBe(0);
})

test('Should apply coupon to seller product in a cart', async () => {
    const response = await request(app).post('/cart/applyCoupon').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        coupon: {
            code: 'HAMILTON20'
        }
    }).expect(200);
    expect(response.body.message).toBe('Coupon has been consumed!')
    const user = await User.findOne({ _id: userThreeId })
    expect(user.coupons.length).toBe(1);
    const cart = await Cart.findOne({ userId: userThreeId });
    expect(cart.products[0].coupon[0].code).toBe('HAMILTON20')
})

test('Should NOT apply a coupon is user is not a customer', async () => {
    const response = await request(app).post('/cart/applyCoupon').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            code: 'HAMILTON20'
        }
    }).expect(400);
    expect(response.body.error).toBe('You can only make this request as a customer!')
})

test('Should NOT apply an invalid coupon', async () => {
    const response = await request(app).post('/cart/applyCoupon').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        coupon: {
            code: 'LOLWTF'
        }
    }).expect(404);
    expect(response.body.error).toBe('Invalid Coupon!')
})

test('Should apply coupon to a particular product in cart', async () => {
    const response = await request(app).post('/cart/applyCoupon').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        coupon: {
            code: 'MIKE20'
        }
    }).expect(200);
    expect(response.body.message).toBe('Coupon has been consumed!')
    const user = await User.findOne({ _id: userThreeId })
    expect(user.coupons.length).toBe(1);
    const cart = await Cart.findOne({ userId: userThreeId });
    expect(cart.products[1].coupon[0].code).toBe('MIKE20')
})

test('Should remove a coupon that has been applied onto a product', async () => {
    const response = await request(app).delete('/cart/deleteCoupon').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        coupon: {
            productId: productOneId
        }
    }).expect(200);
    expect(response.body.message).toBe('Coupon has been removed from this product/seller!')
    const user = await User.findOne({ _id: userThreeId })
    expect(user.coupons.length).toBe(3);
    const cart = await Cart.findOne({ userId: userThreeId });
    expect(cart.products[0].coupon[0]).toBe(null)
})

test('Should remove a seller-wide coupon that has been applied onto a product', async () => {
    const response = await request(app).delete('/cart/deleteCoupon').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        coupon: {
            sellerId: userTwoId
        }
    }).expect(200);
    expect(response.body.message).toBe('Coupon has been removed from this product/seller!')
    const user = await User.findOne({ _id: userThreeId })
    expect(user.coupons.length).toBe(3);
    const cart = await Cart.findOne({ userId: userThreeId });
    expect(cart.products[0].coupon[0]).toBe(null)
})

test('Should NOT remove an invalid seller-wide coupon that has been applied onto a product', async () => {
    const response = await request(app).delete('/cart/deleteCoupon').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        coupon: {
            sellerId: userThreeId
        }
    }).expect(404);
    expect(response.body.error).toBe('Invalid Coupon!')
    const user = await User.findOne({ _id: userThreeId })
    expect(user.coupons.length).toBe(2);
})

test('Should NOT allow non-customer to use /deleteCoupon route', async () => {
    const response = await request(app).delete('/cart/deleteCoupon').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        coupon: {
            sellerId: userThreeId
        }
    }).expect(400);
    expect(response.body.error).toBe('You can only make this request as a customer!')
})