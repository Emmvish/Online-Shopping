const request = require('supertest')
const app = require('../index')
const Feedback = require('../models/feedback')
const Product = require('../models/product')
const { userTwo, userThree, userFour, setupDatabase, userTwoId, productOneId, userFourId, userThreeId, feedbackId, productThreeId, productTwoId } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should submit the feedback of a non-admin user', async () => {
    const message = 'Nice Website!'
    const response = await request(app).post('/feedback/submit').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        feedback: {
            message
        }
    }).expect(201);
    expect(response.body.message).toBe('Your feedback has been submitted!')
    const feedback = await Feedback.findOne({ userId: userThreeId, message });
    expect(feedback).toBeTruthy();
})

test('Should NOT submit the feedback of an admin user', async () => {
    const message = 'Nice Website!'
    const response = await request(app).post('/feedback/submit').set('Authorization', `Bearer ${userFour.tokens[0].token}`).send({
        feedback: {
            message
        }
    }).expect(400);
    expect(response.body.error).toBe('You cannot provide feedback as an admin!')
    const feedback = await Feedback.findOne({ userId: userFourId, message });
    expect(feedback).toBeFalsy();
})

test('Should fetch first page in list of feedbacks for an admin', async () => {
    const response = await request(app).get('/feedback/list').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        firstSearch: true
    }).expect(200);
    expect(response.body.feedbacks[0]._id.toString()).toBe(feedbackId.toString())
    expect(response.body.totalResults).toBe(1);
})

test('Should NOT fetch first page in list of feedbacks for a non-admin', async () => {
    const response = await request(app).get('/feedback/list').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).query({
        firstSearch: true
    }).expect(400);
    expect(response.body.error).toBe('You can only use this feature as an admin!')
})

test('Should submit the complaint of a customer regarding an approved product', async () => {
    const message = 'Poor Product!'
    const response = await request(app).post('/feedback/submitComplaint').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        complaint: {
            message
        },
        product: {
            _id: productThreeId
        }
    }).expect(201);
    expect(response.body.message).toBe('Your complaint has been recorded!')
    const product = await Product.findOne({ _id: productThreeId });
    expect(product.complaints.length).toBe(1);
    expect(product.complaints[0].message).toBe(message);
})

test('Should NOT submit the complaint of a customer regarding a rejected product', async () => {
    const message = 'Poor Product!'
    const response = await request(app).post('/feedback/submitComplaint').set('Authorization', `Bearer ${userThree.tokens[0].token}`).send({
        complaint: {
            message
        },
        product: {
            _id: productTwoId
        }
    }).expect(404);
    expect(response.body.error).toBe('Product was not found!')
    const product = await Product.findOne({ _id: productTwoId });
    expect(product.complaints.length).toBe(0);
})

test('Should NOT submit the complaint of a non-customer', async () => {
    const message = 'Poor Product!'
    const response = await request(app).post('/feedback/submitComplaint').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        complaint: {
            message
        },
        product: {
            _id: productOneId
        }
    }).expect(400);
    expect(response.body.error).toBe('You can only use this feature as a customer!')
})

test('Should fetch first page in list of complaints for a seller', async () => {
    const response = await request(app).get('/feedback/complaints').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).query({
        firstSearch: true
    }).expect(200);
    expect(response.body.complaints.length).toBe(1);
    expect(response.body.complaints[0]._id.toString()).toBe(productOneId.toString());
})

test('Should fetch first page in list of complaints of a seller, for an admin', async () => {
    const response = await request(app).get('/feedback/complaints').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        firstSearch: true,
        sellerId: userTwoId.toString()
    }).expect(200);
    expect(response.body.complaints.length).toBe(1);
    expect(response.body.complaints[0].complaints[0].username).toBe(userThree.name);
})

test('Should NOT fetch first page in list of complaints of a seller, for a customer', async () => {
    const response = await request(app).get('/feedback/complaints').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        firstSearch: true,
        sellerId: userTwoId.toString()
    }).expect(400);
    expect(response.body.error).toBe('You can only use this feature as a seller!')
})
