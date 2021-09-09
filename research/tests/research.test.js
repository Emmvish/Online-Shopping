const request = require('supertest')
const app = require('../index')
const { userTwo, userThree, userFour, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should fetch the second page on the list of products returned when searching as admin', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userFour.tokens[0].token}`).get('/search/products').query({
        searchTerm: 'milton',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.products[0].name).toBe('Milton Jar');
})

test('Should fetch total number of search results when searching with a new term, as an admin', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userFour.tokens[0].token}`).get('/search/products').query({
        searchTerm: 'milton',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.products[0].name).toBe('Milton Dildo');
    expect(response.body.products.length).toBe(1);
    expect(response.body.totalResults).toBe(2);
})

test('Should also fetch products whose stocks have finished, when searching as admin', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userFour.tokens[0].token}`).get('/search/products').query({
        searchTerm: 'spoon',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.products.length).toBe(1);
})

test('Should NOT be able to search for a product as a seller', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userTwo.tokens[0].token}`).get('/search/products').query({
        searchTerm: 'milton',
        firstSearch: true,
        limit: 1
    }).expect(400);
    expect(response.body.error).toBe('You cannot search as a seller!')
})

test('Should NOT be able to search for a user as a seller', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userTwo.tokens[0].token}`).get('/search/users').query({
        searchTerm: 'milton',
        firstSearch: true,
        limit: 1
    }).expect(400);
    expect(response.body.error).toBe('You cannot search as a seller!')
})

test('Should fetch the product being searched as a customer', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).get('/search/products').query({
        searchTerm: 'milton',
        firstSearch: false,
        pageNo: 1,
        limit: 1
    }).expect(200);
    expect(response.body.products[0].name).toBe('Milton Jar');
})

test('Should NOT fetch a rejected product when searching as a customer', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).get('/search/products').query({
        searchTerm: 'milton',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.products.length).toBe(0);
})

test('Should fetch total number of search results when searching with a new term, as a customer', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).get('/search/products').query({
        searchTerm: 'milton',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.products[0].name).toBe('Milton Jar');
    expect(response.body.products.length).toBe(1);
    expect(response.body.totalResults).toBe(1);
})

test('Should NOT fetch products whose stocks have finished, when searching as a customer', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).get('/search/products').query({
        searchTerm: 'spoon',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.products.length).toBe(0);
})

test('Should fetch the second page on the list of users returned when searching as admin', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userFour.tokens[0].token}`).get('/search/users').query({
        searchTerm: 'man',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.users[0].name).toBe('Manish');
})

test('Should fetch the desired customer when searching as admin', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userFour.tokens[0].token}`).get('/search/users').query({
        searchTerm: 'man',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.users[0].name).toBe('Manish');
    expect(response.body.users[0].role).toBe('customer');
})

test('Should fetch the total number of search results when searching as an admin using new search term', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userFour.tokens[0].token}`).get('/search/users').query({
        searchTerm: 'man',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.totalRecords).toBe(2);
})

test('Should fetch the first page on the list of sellers returned when searching as customer', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).get('/search/users').query({
        searchTerm: 'mike',
        firstSearch: false,
        pageNo: 1
    }).expect(200);
    expect(response.body.users[0].name).toBe('Mike');
})

test('Should NOT fetch a non-seller profile when searching as customer', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).get('/search/users').query({
        searchTerm: 'man',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.users.length).toBe(0)
})

test('Should fetch the total number of search results when searching as a customer using new search term', async () => {
    const response = await request(app).set('Authorization', `Bearer ${userThree.tokens[0].token}`).get('/search/users').query({
        searchTerm: 'Hamilton',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.totalRecords).toBe(1);
})