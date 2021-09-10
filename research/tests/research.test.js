const request = require('supertest')
const app = require('../index')
const { userTwo, userThree, userFour, setupDatabase, userTwoId, productOneId, userFourId } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should fetch the second page on the list of products returned when searching as admin', async () => {
    const response = await request(app).get('/search/products').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        searchTerm: 'milton',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.products.length).toBe(1)
    expect(response.body.products[0].name).toBe('Milton Dildo');
})

test('Should fetch total number of search results when searching with a new term, as an admin', async () => {
    const response = await request(app).get('/search/products').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        searchTerm: 'milton',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.products[0].name).toBe('Milton Jar');
    expect(response.body.products.length).toBe(1);
    expect(response.body.totalResults).toBe(2);
})

test('Should also fetch products whose stocks have finished, when searching as admin', async () => {
    const response = await request(app).get('/search/products').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        searchTerm: 'spoon',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.products.length).toBe(1);
})

test('Should NOT be able to search for a product as a seller', async () => {
    const response = await request(app).get('/search/products').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).query({
        searchTerm: 'milton',
        firstSearch: true,
        limit: 1
    }).expect(400);
    expect(response.body.error).toBe('You cannot search as a seller!')
})

test('Should NOT be able to search for a user as a seller', async () => {
    const response = await request(app).get('/search/users').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).query({
        searchTerm: 'milton',
        firstSearch: true,
        limit: 1
    }).expect(400);
    expect(response.body.error).toBe('You cannot search as a seller!')
})

test('Should fetch the product being searched as a customer', async () => {
    const response = await request(app).get('/search/products').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        searchTerm: 'milton',
        firstSearch: false,
        pageNo: 1,
        limit: 1
    }).expect(200);
    expect(response.body.products[0].name).toBe('Milton Jar');
})

test('Should NOT fetch a rejected product when searching as a customer', async () => {
    const response = await request(app).get('/search/products').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        searchTerm: 'milton',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.products.length).toBe(0);
})

test('Should fetch total number of search results when searching with a new term, as a customer', async () => {
    const response = await request(app).get('/search/products').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        searchTerm: 'milton',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.products[0].name).toBe('Milton Jar');
    expect(response.body.products.length).toBe(1);
    expect(response.body.totalResults).toBe(1);
})

test('Should NOT fetch products whose stocks have finished, when searching as a customer', async () => {
    const response = await request(app).get('/search/products').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        searchTerm: 'spoon',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.products.length).toBe(0);
})

test('Should fetch the second page on the list of users returned when searching as admin', async () => {
    const response = await request(app).get('/search/users').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        searchTerm: 'man',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.users[0].name).toBe('Man');
})

test('Should fetch the desired customer when searching as admin', async () => {
    const response = await request(app).get('/search/users').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        searchTerm: 'man',
        firstSearch: false,
        pageNo: 1,
        limit: 1
    }).expect(200);
    expect(response.body.users[0].name).toBe('Manish');
    expect(response.body.users[0].role).toBe('customer');
})

test('Should fetch the total number of search results when searching as an admin using new search term', async () => {
    const response = await request(app).get('/search/users').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        searchTerm: 'man',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.totalResults).toBe(2);
})

test('Should fetch the first page on the list of sellers returned when searching as customer', async () => {
    const response = await request(app).get('/search/users').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        searchTerm: 'mike',
        firstSearch: false,
        pageNo: 1
    }).expect(200);
    expect(response.body.users[0].name).toBe('Mike');
})

test('Should NOT fetch a non-seller profile when searching as customer', async () => {
    const response = await request(app).get('/search/users').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        searchTerm: 'man',
        firstSearch: false,
        pageNo: 2,
        limit: 1
    }).expect(200);
    expect(response.body.users.length).toBe(0)
})

test('Should fetch the total number of search results when searching as a customer using new search term', async () => {
    const response = await request(app).get('/search/users').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        searchTerm: 'Hamilton',
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.totalResults).toBe(1);
})

test('Should obtain the first page of list of all products offered by a seller, for a customer; while excluding rejected products.', async () => {
    const response = await request(app).get('/search/sellerProducts').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        sellerId: userTwoId,
        firstSearch: true,
        limit: 1
    }).expect(200);
    expect(response.body.totalResults).toBe(1);
    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0]._id.toString()).toBe(productOneId.toString())
})

test('Should NOT allow non-customers to use /sellerProducts route.', async () => {
    const response = await request(app).get('/search/sellerProducts').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        sellerId: userTwoId,
        firstSearch: true,
        limit: 1
    }).expect(400);
    expect(response.body.error).toBe('This user is not a customer!');
})

test('Should fetch profile of a seller for the customer.', async () => {
    const response = await request(app).get('/search/sellerProducts').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        sellerId: userTwoId
    }).expect(200);
    expect(response.body.seller._id.toString()).toBe(userTwoId.toString());
})

test('Should NOT fetch profile of a non-seller for customer via this route.', async () => {
    const response = await request(app).get('/search/sellerProducts').set('Authorization', `Bearer ${userThree.tokens[0].token}`).query({
        sellerId: userFourId
    }).expect(404);
    expect(response.body.error).toBe('This user does NOT exist in our database!')
})

test('Should NOT fetch a profile for a non-customer via this route.', async () => {
    const response = await request(app).get('/search/sellerProducts').set('Authorization', `Bearer ${userFour.tokens[0].token}`).query({
        sellerId: userTwoId
    }).expect(400);
    expect(response.body.error).toBe('This user is not a customer!');
})
