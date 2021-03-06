const express = require('express')
const jwt = require('jsonwebtoken')

require('./db/mongoose')
const productRouter = require('./routers/product');
const User = require('./models/user')
const Product = require('./models/product')

const eventBusUrl = process.env.EVENT_BUS_URL || 'amqp://localhost'
const connection = require('amqplib').connect(eventBusUrl);
const userQueue = process.env.USER_QUEUE || 'User';
const productQueue = process.env.PRODUCT_QUEUE || 'Product';
const orderQueue = process.env.ORDER_QUEUE || 'Order';

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(userQueue).then(function(ok) {
        return ch.consume(userQueue, function(msg) {
        if (msg !== null) {
            const { type, data } = JSON.parse(msg.content.toString())
            handleEvent(type, data);
            ch.ack(msg);
        }
    });
});  
}).catch(console.warn);

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(productQueue).then(function(ok) {
        return ch.consume(productQueue, function(msg) {
        if (msg !== null) {
            const { type, data } = JSON.parse(msg.content.toString())
            handleEvent(type, data);
            ch.ack(msg);
        }
    });
});  
}).catch(console.warn);

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(orderQueue).then(function(ok) {
        return ch.consume(orderQueue, function(msg) {
        if (msg !== null) {
            const { type, data } = JSON.parse(msg.content.toString())
            handleEvent(type, data);
            ch.ack(msg);
        }
    });
});  
}).catch(console.warn);

let productChannel;

connection.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    ch.assertQueue(productQueue).then(function(ok) {
        productChannel = ch;
    });
}).catch(console.warn);

const app = express();

const serverPort = process.env.PORT || 4004;

app.use(express.json());

app.use(productRouter);

async function handleEvent(type, data) {

    const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'

    switch(type) {

        case 'UserAdded':
            const user = new User(data.user);
            try {
                await user.save();
            } catch(e) {
                console.log(e.message)
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
            } catch(e) {
                console.log(e.message)
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
                } else {
                    throw new Error('Error! Admin user was NOT created!')
                }
            } catch(e) {
                console.log(e.message)
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
            } catch(e) {
                console.log(e.message)
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
            } catch(e) {
                console.log(e.message)
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
            } catch(e) {
                console.log(e.message)
            }
            break;

        case 'UserLoggedOut':
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token })
                user.tokens = user.tokens.filter((token) => token.token !== data.token);
                await user.save();
            } catch(e) {
                console.log(e.message)
            }
            break;

        case 'ProductModerated': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
                if(!user) {
                    throw new Error('Product cannot be associated with a seller!')
                }
                const product = await Product.findOne({ _id: data.product._id, sellerId: user._id });
                if(!product) {
                    throw new Error('This product does NOT exist!');
                }
                product.status = data.product.status;
                await product.save();
                const event = { type: 'ProductEdited', data: { token: data.token, product: { _id: data.product._id, updates: { status: data.product.status } } } }
                productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            } catch(e) {
                console.log(e.message)
            }
            break;

        case 'OrderCreated':
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'customer' })
                if(!user) {
                    throw new Error('User who placed this order could not be found!');
                }
                const product = await Product.findOne({ _id: data.product.productId });
                if(!product) {
                    throw new Error('This product does NOT exist in database!');
                }
                product.quantity = product.quantity - data.product.quantity;
                await product.save();
                const event = { type: 'ProductEdited', data: { token: data.token, product: { _id: product._id, updates: { quantity: product.quantity } } } }
                productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            } catch(e) {
                console.log(e.message)
            }
            break;

        case 'OrderCancelled':
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'customer' })
                if(!user) {
                    throw new Error('User who placed this order could not be found!');
                }
                const product = await Product.findOne({ _id: data.product.productId });
                if(!product) {
                    throw new Error('This product does NOT exist in database!');
                }
                product.quantity = product.quantity + data.product.updates.quantity;
                await product.save();
                const event = { type: 'ProductEdited', data: { token: data.token, product: { _id: product._id, updates: { quantity: product.quantity } } } }
                productChannel.sendToQueue(productQueue, Buffer.from(JSON.stringify(event)));
            } catch(e) {
                console.log(e.message)
            }
            break;

    }
}

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort)
})

module.exports = app;