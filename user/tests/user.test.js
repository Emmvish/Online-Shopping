const request = require('supertest')
const app = require('../index')
const User = require('../models/user')
const { userOneId, userOne, userTwoId, userTwo, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

jest.mock('nodemailer', ()=>({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockReturnValue((mailoptions, callback) => {})
    })
}))

test('Should signup a new customer', async () => {
    const response = await request(app).post('/users/register').send({
        name: 'Srishti',
        email: 'tutormew@example.com',
        password: 'imtutorme',
        role: 'customer',
        address: 'Delhi'
    }).expect(201)
    const user = await User.findById(response.body.user._id)
    expect(user).not.toBeNull()
    expect(user.password).not.toBe('imtutorme')
})

test('Should NOT signup pre-existing customer again', async () => {
    const response = await request(app).post('/users/register').send({
        name: 'Mike',
        email: 'mike@example.com',
        password: 'whateverlol',
        role: 'customer',
        address: 'Delhi'
    }).expect(400);
    expect(response.body).toMatchObject({ error: 'This user account already exists. Please choose a different name!' })
})

test('Should signup a new seller', async () => {
    const response = await request(app).post('/users/register').send({
        name: 'Manish',
        email: 'manish@example.com',
        password: 'whateverlol',
        role: 'seller',
        address: 'Delhi'
    }).expect(201)
    const user = await User.findById(response.body.user._id)
    expect(user).not.toBeNull()
    expect(user.password).not.toBe('whateverlol')
})

test('Should NOT signup a new admin from customer account', async () => {
    const response = await request(app).post('/users/registeradmin').set('Authorization', `Bearer ${userOne.tokens[0].token}`).send({
        name: 'Manish',
        email: 'manish@example.com',
        password: 'whateverlol',
        role: 'admin',
        address: 'Delhi'
    }).expect(401)
    expect(response.body).toMatchObject({ error: 'You must be an admin to create an admin account!' });
})

test('Should NOT signup a new admin from any account if using /register route', async () => {
    const response = await request(app).post('/users/register').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        name: 'Manish',
        email: 'manish@example.com',
        password: 'whateverlol',
        role: 'admin',
        address: 'Delhi'
    }).expect(400)
    expect(response.body).toMatchObject({ error: 'You must hit the other route to create an admin user!' });
})

test('Should signup a new admin from admin account if using /registeradmin route', async () => {
    const response = await request(app).post('/users/registeradmin').set('Authorization', `Bearer ${userTwo.tokens[0].token}`).send({
        name: 'Manish',
        email: 'manish@example.com',
        password: 'whateverlol',
        role: 'admin',
        address: 'Delhi'
    }).expect(201)
    const user = await User.findById(response.body.user._id)
    expect(user).not.toBeNull()
    expect(user.password).not.toBe('whateverlol')
})

test('Should get profile of any user as an admin', async () => {
    const response = await request(app)
        .get('/users/person')
        .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
        .send({ currentName: 'Mike' }).expect(200)
})

test('Should NOT get profile of any other user as a non-admin', async () => {
    const response = await request(app)
        .get('/users/person')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({ currentName: 'Jess' }).expect(401)
    expect(response.body).toMatchObject({ error: 'Such request can only be entertained for site admins.' });
        
})

test('Should get my own profile', async () => {
    const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send().expect(200)
})

test('Should not get profile for unauthenticated user', async () => {
    const response = await request(app)
        .get('/users/me')
        .send().expect(401)
    expect(response.body).toMatchObject({ error: 'Please Authenticate!' })
})

test('Should NOT delete other account as non-admin', async () => {
    const response = await request(app)
        .delete('/users/admindelete')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({ currentName: 'Jess' }).expect(401)
    expect(response.body).toMatchObject({ error: 'Such request can only be entertained for site admins.' })
    const user = await User.findById(userTwoId)
    expect(user).not.toBeNull();
})

test('Should delete my own account', async () => {
    await request(app)
        .delete('/users/delete')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send().expect(201)
    const user = await User.findById(userOneId)
    expect(user).toBeNull()
})

test('Should be able to delete other account as an admin', async () => {
    await request(app)
        .delete('/users/admindelete')
        .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
        .send({ currentName: 'Mike' }).expect(201)
    const user = await User.findById(userOneId)
    expect(user).toBeNull()
})

test('Should NOT delete account for unauthenticated user on delete route', async () => {
    const response = await request(app)
        .delete('/users/delete')
        .send().expect(401)
    expect(response.body).toMatchObject({ error: 'Please Authenticate!' })    
})

test('Should NOT delete account for unauthenticated user on admindelete route', async () => {
    const response = await request(app)
        .delete('/users/admindelete')
        .send().expect(401)
    expect(response.body).toMatchObject({ error: 'Please supply an authentication token!' })    
})

test('Should update valid user fields', async () => {
    await request(app)
        .patch('/users/edit')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            name: 'WTFNAME'
        })
        .expect(201)
    const user = await User.findById(userOneId)
    expect(user.name).toBe('WTFNAME')
})

test('Should not update invalid user fields', async () => {
    await request(app)
        .patch('/users/edit')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            location: 'Australia'
        }).expect(400)
})

test('Should allow user to change password via /forgotpassword route', async () => {
    const response = await request(app)
                           .post('/users/forgotpassword')
                           .send({ name: 'Mike' })
                           .expect(201)
    expect(response.body.message).not.toBeNull();
})