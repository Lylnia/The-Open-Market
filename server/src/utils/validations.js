const Joi = require('joi');

const bidSchema = Joi.object({
    body: Joi.object({
        nftId: Joi.string().required().messages({ 'any.required': 'nftId is required' }),
        amount: Joi.number().positive().required().messages({
            'number.positive': 'Bid amount must be a positive number',
            'any.required': 'amount is required'
        }),
    }).unknown(false)
});

const listSchema = Joi.object({
    body: Joi.object({
        price: Joi.number().positive().required().messages({
            'number.positive': 'List price must be a positive number',
            'any.required': 'price is required'
        }),
    }).unknown(false)
});

const buySchema = Joi.object({
    params: Joi.object({
        id: Joi.string().required()
    }).unknown(true)
});

const transferSchema = Joi.object({
    body: Joi.object({
        nftId: Joi.string().required(),
        recipientUsername: Joi.string().required(),
    }).unknown(false)
});

module.exports = {
    bidSchema,
    listSchema,
    buySchema,
    transferSchema
};
