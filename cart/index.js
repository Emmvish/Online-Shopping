const express = require('express')
const jwt = require('jsonwebtoken')

require('./db/mongoose')
const cartRouter = require('./routers/cart');
const User = require('./models/user')
const Product = require('./models/product')
const Cart = require('./models/cart')

const eventBusUrl = process.env.EVENT_BUS_URL || 'amqp://localhost'
const connection = require('amqplib').connect(eventBusUrl);
const userQueue = process.env.USER_QUEUE || 'User';
const productQueue = process.env.PRODUCT_QUEUE || 'Product';
const couponQueue = process.env.COUPON_QUEUE || 'Coupon';

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
    ch.assertQueue(couponQueue).then(function(ok) {
        return ch.consume(couponQueue, function(msg) {
        if (msg !== null) {
            const { type, data } = JSON.parse(msg.content.toString())
            handleEvent(type, data);
            ch.ack(msg);
        }
    });
});  
}).catch(console.warn);

const app = express();

const serverPort = process.env.PORT || 4006;

app.use(express.json());

app.use(cartRouter);

async function handleEvent(type, data) {

    const jwtSecret = process.env.JWT_SECRET || 'Some-Secret-Key'

    switch(type) {

        case 'UserAdded':
            const user = new User(data.user);
            try {
                await user.save();
                if(user.role === 'customer') {
                    const cart = new Cart({ userId: user._id, products: [] });
                    await cart.save();
                }
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
                if(user.role === 'customer') {
                    const cart = await Cart.findOne({ userId: user._id });
                    await cart.remove();
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
                if(userToRemove.role === 'customer') {
                    const cart = await Cart.findOne({ userId: userToRemove._id });
                    await cart.remove();
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

        case 'ProductAdded': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const user = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
                if(!user) {
                    throw new Error('User was not found!')
                }
                const product = new Product(data.product);
                await product.save();
            } catch(e) {
                console.log(e.message)
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
            } catch(e) {
                console.log(e.message)
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
            } catch(e) {
                console.log(e.message)
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
            } catch(e) {
                console.log(e.message)
            }
            break;

        case 'CouponCreated': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const seller = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
                if(!seller) {
                    throw new Error('Seller was not found!')
                }
                if(data.coupon.productId) {
                    const product = await Product.findOne({ _id: data.coupon.productId, status: 'approved', sellerId: seller._id });
                    if(!product) {
                        throw new Error('This product does NOT exist in database!')
                    }
                    data.coupon.productName = product.name;
                }
                if(data.coupon.discountPercentage < 10 || data.coupon.discountPercentage > 90) {
                    throw new Error('Discount Percentage must be between 10 and 90.')
                }
                const coupon = seller.coupons.find((coupon) => coupon.code === data.coupon.code)
                if(coupon) {
                    throw new Error('This coupon already exists!')
                }
                data.coupon.sellerId = seller._id;
                data.coupon.sellerName = seller.name;
                seller.coupons.push(daya.coupon);
                await seller.save();
                const customers = await User.find({ role: 'customer' });
                for( let i = 0; i < customers.length; i++ ) {
                    customers[i].coupons.push(data.coupon)
                    await customers[i].save()
                }
            } catch(e) {
                console.log(e.message)
            }
            break;

        case 'CouponDeleted': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const seller = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'seller' })
                if(!seller) {
                    throw new Error('Seller was not found!')
                }
                if(data.coupon.productId) {
                    const product = await Product.findOne({ _id: data.coupon.productId, status: 'approved', sellerId: seller._id });
                    if(!product) {
                        throw new Error('This product does NOT exist in database!')
                    }
                }
                seller.coupons = seller.coupons.filter((coupon) => coupon.code !== data.coupon.code)
                await seller.save()
                const customers = await User.find({ role: 'customer' });
                for( let i = 0; i < customers.length; i++ ) {
                    customers[i].coupons = customers[i].coupons.filter((coupon) => coupon.code !== data.coupon.code)
                    await customers[i].save()
                }
            } catch(e) {
                console.log(e.message)
            }
            break;

        case 'CouponUsed': 
            try {
                const decoded = jwt.verify(data.token, jwtSecret)
                const customer = await User.findOne({ _id: decoded._id, 'tokens.token': data.token, role: 'customer' })
                if(!customer) {
                    throw new Error('Customer was not found!')
                }
                customer.coupons = customer.coupons.filter((coupon) => coupon.code !== data.coupon.code);
                await customer.save();
            } catch(e) {
                console.log(e.message)
            }
            break;            
    }
}

app.listen(serverPort, ()=>{
    console.log('Listening at port: ' + serverPort)
})
