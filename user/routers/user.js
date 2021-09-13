const axios = require('axios');
const express = require('express');
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require('uuid');

const myEmail = "mvtinder98@gmail.com"
const myEmailPassword = process.env.EMAIL_PASSWORD || '********'

const transport = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: myEmail,
		pass: myEmailPassword
	}
});

const message = {
	from: myEmail,
	to: "",
	subject: "",
	text: ""
};

const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4001/events'

const User = require('../models/user')
const auth = require('../middleware/auth')
const authAdmin = require('../middleware/authAdmin')
const router = new express.Router()

async function registerUser (req, res, admin) {
    const user = new User(req.body)
    try {
        await user.save();
        if(!admin) {
            axios.post(eventBusUrl, { type: 'UserAdded', data: { user: user.toJSON() } }).catch((err)=>{
                console.log(err);
            })
        } else {
            axios.post(eventBusUrl, { type: 'AdminAdded', data: { user: user.toJSON(), token: req.token } }).catch((err)=>{
                console.log(err);
            })
        }
        res.status(201).send({ user });
    } catch (e) {
        res.status(400).send({ error: 'This user account already exists. Please choose a different name!' })
    }
}

router.post('/users/register', async (req, res) => {
    if(req.body.role === 'admin') {
        res.status(400).send({ error: 'You must hit the other route to create an admin user!' })
    } else {
        await registerUser(req, res, false);
    }
})

router.post('/users/registeradmin', auth, async (req, res) => {
    if(req.user.role === 'admin') {
        await registerUser(req, res, true);
    } else {
        res.status(401).send({ error: 'You must be an admin to create an admin account!' })
    }
})

router.post('/users/auth', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.name, req.body.password)
        if(!user) {
            throw new Error('User was not found!')
        }
        const token = await user.generateAuthToken()
        axios.post(eventBusUrl, { type: 'UserLoggedIn', data: { user: user.toJSON(), token } }).catch((err)=>{
            console.log(err);
        })
        res.status(200).send({ user, token })
    } catch (e) {
        res.status(401).send({ error: e.message })
    }
})

router.post("/users/forgotpassword", async (req,res)=>{
    const user = await User.findOne({name: req.body.name});
    if(!user || user.role === 'admin'){
        res.send({ error: 'User was not found!' });
        return;
    } else {
        try {
            const newPassword = uuidv4().split("-").join("");
            user.password = newPassword;
            await user.save();
            message.to = user.email;
            message.subject = "Team Manish Varma | Your new Password"
            message.text = `Hi, ${user.name}, Your New Password is: ${newPassword} . - Team Manish Varma`;
            transport.sendMail(message, function(err){
                if(err){
                    res.status(503).send({ error: 'This service is unavailable!' });
                }
            });
            res.status(201).send({ message });
        } catch(e){
            res.status(503).send({ error: 'This Service is Unavailable!' });
        }
    }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        axios.post(eventBusUrl, { type: 'UserLoggedOut', data: { user: req.user.toJSON(), token: req.token } }).catch((err)=>{
            console.log(err);
        })
        res.status(200).send()
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/users/me', auth, async (req, res) => {
    res.status(200).send({ user: req.user.toJSON() })
})

router.get('/users/person', authAdmin, async (req, res) => {
    res.status(200).send({ user: req.user.toJSON() })
})

async function editAccount(req, res) {
    delete req.body.currentName;
    const allowedUpdates = ['name', 'password','email', 'address']
    const updates = Object.keys(req.body)

    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    const isValidUpdateValue = true;
    allowedUpdates.forEach((field)=>{
        if(req.body[field] === '') {
            isValidUpdateValue = false;
        }
    })

    if (!isValidOperation || !isValidUpdateValue) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        axios.post(eventBusUrl, { type: 'UserEdited', data: { updates: req.body, token: req.token } }).catch((err)=>{
            console.log(err);
        })
        res.status(201).send({ user: req.user })
    } catch (e) {
        res.status(503).send({ error: 'Update could not be applied!' })
    }
}

router.patch('/users/edit', auth, async (req, res) => {
    await editAccount(req, res);
})

// router.post('/users/adminedit', authAdmin, async (req, res) => {
//     await editAccount(req, res);
// })

async function deleteAccount (req, res, admin) {
    try {
        const userToDelete = req.user.toJSON();
        await req.user.remove();
        if(!admin) {
            axios.post(eventBusUrl, { type: 'UserRemoved', data: { user: userToDelete, token: req.token } }).catch((err)=>{
                console.log(err);
            })
        } else {
            axios.post(eventBusUrl, { type: 'AdminRemovedUser', data: { user: userToDelete, token: req.token } }).catch((err)=>{
                console.log(err);
            })
        }
        res.status(201).send(userToDelete);
    } catch (e) {
        res.status(503).send({ error: 'Deletion could not be performed!' })
    }
}

router.delete('/users/delete', auth, async (req, res) => {
    await deleteAccount(req, res, false);
})

router.delete('/users/admindelete', authAdmin, async (req, res) => {
    await deleteAccount(req, res, true);
})

module.exports = router