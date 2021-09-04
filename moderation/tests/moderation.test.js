const request = require('supertest')
const app = require("../index")

test('Should Reject the Product', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { name: 'Ass Opener', status: 'pending'} }).expect(200);
    expect(response).toMatchObject({
        type: 'ProductModerated',
        data: {
            name: 'Ass Opener',  
            status: 'rejected'
        }
    })
})

test('Should Approve the Product', async () => {
    const response = await request(app).post('/events').send({ type: 'ModerateProduct', data: { name: 'Smartphone', status: 'pending'} }).expect(200);
    expect(response).toMatchObject({
        type: 'ProductModerated',
        data: {
            name: 'Smartphone',
            status: 'approved'
        }
    })
})