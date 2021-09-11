const Product = require('../models/product');

const checkProduct = async (req, res, next) => {
    try {
        const product = await Product.findOne({ _id: req.body.product._id, status: 'approved' });
        if(product) {
            req.product = product;
            next();
        } else {
            throw new Error('Product was not found!')
        }
    } catch(e) {
        res.status(404).send({ error: e.message })
    }
}

module.exports = checkProduct;