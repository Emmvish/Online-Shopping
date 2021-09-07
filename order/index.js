const express = require('express')
const jwt = require('jsonwebtoken')
const axios = require('axios')

require('./db/mongoose')
const orderRouter = require('./routers/order');
const User = require('./models/user')
const Product = require('./models/product')
const Order = require('./models/order')

const app = express();

const serverPort = process.env.PORT || 4007;

app.use(express.json());

app.use(orderRouter);

const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4001/events'

async function handleEvent(type, data, res) {

    const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'

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

        case 'ProductAdded': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
                if(!user) {
                    throw new Error('User was not found!')
                }
                const product = new Product(data.product);
                await product.save();
                res.send();
            } catch(e) {
                res.send({ error: e.message });
            }
            break;

    case 'ProductRemoved': 
        try {
            const decoded = jwt.verify(data.token, jwtSecret)
            const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
            if(!user) {
                throw new Error('User was not found!')
            }
            const product = await Product.findOne({ _id: data.product._id, sellerId: user._id });
            if(!product) {
                throw new Error('Product was not found!')
            }
            await product.remove();
            res.send();
        } catch(e) {
            res.send({ error: e.message });
        }
        break;

    case 'ProductEdited': 
        try {
            const decoded = jwt.verify(data.token, jwtSecret)
            const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
            if(!user) {
                throw new Error('User was not found!')
            }
            const product = await Product.findOne({ _id: data.product._id, sellerId: user._id });
            if(!product) {
                throw new Error('Product was not found!')
            }
            const allowedUpdates = ['name', 'price', 'quantity', 'status'];
            const updates = Object.keys(data.product.updates);
            const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
            const isValidUpdateValue = true;
            allowedUpdates.forEach((field)=>{
                if(data.product.updates[field] === '') {
                    isValidUpdateValue = false;
                }
            })
            if (!isValidOperation || !isValidUpdateValue) {
                throw new Error('Invalid updates!');
            }
            updates.forEach((update) => product[update] = data.product[update])
            await product.save();
            res.send();
        } catch(e) {
            res.send({ error: e.message });
        }
        break;

    case 'ProductRated':
        try {
            const decoded = jwt.verify(data.token, jwtSecret)
            const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'customer' })
            if(!user) {
                throw new Error('User was not found!')
            }
            const product = await Product.findOne({ _id: data.product._id, sellerId: user._id, status: 'approved' });
            if(!product) {
                throw new Error('Product was not found!')
            }
            product.rating = ((product.totalRatings*product.rating) + data.product.rating)/(product.totalRatings + 1);
            product.totalRatings++;
            await product.save();
            res.send();
        } catch(e) {
            res.send({ error: e.message });
        }
        break;

    case 'PlaceOrder': 
        try {
            const decoded = jwt.verify(data.token, jwtSecret)
            const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'customer' })
            if(!user) {
                throw new Error('User was not found!')
            }
            const product = await Product.findOne({ _id: data.product.productId, status: 'approved' });
            if(!product) {
                throw new Error('This product does NOT exist in database!')
            }
            if(product.quantity - data.product.quantity < 0) {
                throw new Error('Unable to serve this order!')
            }
            const order = new Order({ date: Date.now(), sellerId: product.sellerId, userId: user._id, productId: product._id, quantity: data.product.quantity, totalValue: data.product.quantity*product.price, status: 'pending' })
            await order.save();
            axios.post(eventBusUrl, { type: 'OrderCreated', data: { token: data.token, product: data.product, order } }).catch((err)=>{
                console.log(err);
            })
            res.send();
        } catch(e) {
            res.send({ error: e.message });
        }
        break;

    }
}

app.post('/events', (req, res) => {
    const { type, data } = req.body;
    handleEvent(type, data, res);
})

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort)
})

module.exports = app;