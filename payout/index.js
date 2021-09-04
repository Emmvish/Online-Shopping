const express = require('express')
const jwt = require('jsonwebtoken')

require('./db/mongoose')
const payoutRouter = require('./routers/payout');
const User = require('./models/user')
const Product = require('./models/product')
const Order = require('./models/order')

const app = express();

app.use(express.json());

app.use(payoutRouter);

async function handleEvent(type, data, res) {
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
                const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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
                const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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
                const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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
                const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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
                const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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
                const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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
            const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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
            const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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
            const decoded = jwt.verify(data.token, 'Some-Secret-Key')
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

    case 'OrderCreated': 
        try {
            const decoded = jwt.verify(data.token, 'Some-Secret-Key')
            const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'customer' })
            if(!user) {
                throw new Error('User was not found!')
            }
            const product = await Product.findOne({ _id: data.order.productId });
            if(!product) {
                throw new Error('Product was not found!')
            }
            const order = new Order(data.order);
            await order.save();
            res.send();
        } catch(e) {
            res.send({ error: e.message });
        }
        break;

    case 'OrderEdited': 
        try {
            const decoded = jwt.verify(data.token, 'Some-Secret-Key')
            const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
            if(!user) {
                throw new Error('User was not found!')
            }
            const statusUpdate = data.order.updates.status;
            if(!statusUpdate) {
                throw new Error('Invalid Updates!')
            }
            const order = await Order.findOne({ _id: data.order._id });
            if(!order) {
                throw new Error('Order was not found!')
            }
            order.status = statusUpdate;
            await order.save();
            if(statusUpdate === 'delivered') {
                user.monthlyEarnings += data.order.totalValue;
                await user.save();
            }
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

app.listen(4008, ()=>{
    console.log('Listening at port: 4008')
})

module.exports = app;