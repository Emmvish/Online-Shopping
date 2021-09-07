const axios = require('axios')
const express = require('express')
const jwt = require('jsonwebtoken')
const Filter = require('bad-words')

require('./db/mongoose')

const app = express();

const serverPort = process.env.PORT || 4002;

app.use(express.json())

const User = require('./models/user')

const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'

async function handleUserEvent(type, data, res) {

    switch(type) {

        case 'UserAdded':
            const user = new User(data.user);
            try {
                await user.save();
                res.send();
            } catch(e) {
                res.send({ error: e.message });
            }
            break;

        case 'UserLoggedIn': 
            try {
                const user = await User.findOne({ name: data.name });
                if(!user) {
                    throw new Error('User Not Found!');
                }
                user.tokens = user.tokens.concat({ token: data.token });
                await user.save();
                res.send();
            } catch(e) {
                res.send({ error: e.message });
            }
            break;

        case 'AdminAdded': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const adminUser = await User.findOne({ _id: decoded._id, 'tokens.token': data.token })
                if(!adminUser) {
                    throw new Error('User Not Found!');
                }
                if(data.user.role === 'admin' && adminUser.role === 'admin') {
                    const user = new User(data.user);
                    await user.save();
                    res.send();
                } else {
                    throw new Error('Error! Admin user was NOT created!')
                }
            } catch(e) {
                res.send({ error: e.message });
            }
            break;

        case 'UserRemoved': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token })
                if(!user) {
                    throw new Error('No such user exists!');
                }
                await user.remove();
                res.send();
            } catch(e) {
                res.send({ error: e.message });
            }
            break;

        case 'AdminRemovedUser': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const adminUser = await User.findOne({ _id: decoded._id, 'tokens.token': data.token })
                if(!adminUser) {
                    throw new Error('Unable to remove this user as admin!');
                }
                const userToRemove = await User.findOne({ name: data.name });
                if(!userToRemove){
                    throw new Error('This user does NOT exist!');
                }
                await userToRemove.remove();
                res.send();
            } catch(e) {
                res.send({ error: e.message });
            }
            break;

        case 'UserEdited':
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token })
                const allowedUpdates = ['name', 'email', 'address'];
                const updates = Object.keys(data.updates);
                const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
                const isValidUpdateValue = true;
                allowedUpdates.forEach((field)=>{
                    if(data.updates[field] === '') {
                        isValidUpdateValue = false;
                    }
                })
                if (!isValidOperation || !isValidUpdateValue) {
                    throw new Error('Invalid updates!');
                }
                updates.forEach((update) => user[update] = data.updates[update])
                await user.save()
                res.send();
            } catch(e) {
                res.send({ error: e.message });
            }
            break;

        case 'UserLoggedOut':
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token })
                user.tokens = user.tokens.filter((token) => token.token !== data.token);
                await user.save();
                res.send();
            } catch(e) {
                res.send({ error: e.message });
            }
            break;
    }
}

app.post('/events', (req, res)=>{
    const { type, data } = req.body;
    if(type === 'ModerateProduct' && data.product.status === 'pending') {
        const decoded = jwt.verify(data.token, jwtSecret)
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
        if(!user) {
            res.status(401).send({ error: 'User was not found in the database!' })
        } else {
            const filter = new Filter();
            if(filter.isProfane(data.product.name)) {
                data.product.status = 'rejected';
            } else {
                data.product.status = 'approved';
            }
            axios.post('http://localhost:4001/events', { type: 'ProductModerated', data }).catch((err)=>{
                res.status(503).send({ message: 'Cannot broadcast this event via Event Bus!' });
            })
            res.status(200).send({ type: 'ProductModerated', data });
        }
    } else {
        handleUserEvent(type, data, res);
    }
})

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort)
})

module.exports = app;