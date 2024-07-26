const Joi = require('joi');

const listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    price: Joi.number().required().min(0),
    description: Joi.string().required(),
    location: Joi.string().required(),
    // Add other listing fields here
  }).required()
});

const reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    text: Joi.string().required(),
    // Add other review fields here
  }).required()
});

module.exports = { listingSchema, reviewSchema };