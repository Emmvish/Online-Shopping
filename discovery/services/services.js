const services = {
    authentication: process.env.AUTHENTICATION_SERVICE || 'http://localhost:4001',
    moderation: process.env.MODERATION_SERVICE || 'http://localhost:4002',
    user: process.env.USER_SERVICE || 'http://localhost:4003',
    product: process.env.PRODUCT_SERVICE || 'http://localhost:4004',
    research: process.env.RESEARCH_SERVICE || 'http://localhost:4005',
    cart: process.env.CART_SERVICE || 'http://localhost:4006',
    order: process.env.ORDER_SERVICE || 'http://localhost:4007',
    payout: process.env.PAYOUT_SERVICE || 'http://localhost:4008',
    feedback: process.env.FEEDBACK_SERVICE || 'http://localhost:4009',
    coupons: process.env.COUPONS_SERVICE || 'http://localhost:4010'
}

module.exports = services;