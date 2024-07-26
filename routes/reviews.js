const express = require("express");
const router = express.Router({mergeParams: true});
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { reviewSchema } = require("../schema");
const Review = require("../models/review");
const Listing = require("../models/listing");

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(404, errMsg);
  } else {
    next();
  }
};

// Review Post Route

router.post(
  "/",
  validateReview,
  wrapAsync(async (req, res) => {
 let listing =await Listing.findById(req.params.id);
 let newReview =new Review(res.body.review);
 
 listing.review.push(newReview);
 
 await newReview.save();
 await listing.save();

 res.redirect(`/listing/${lisiting._id}`);
  })
);

// Delete Review Route
router.delete(
  "/:reviewId",
  wrapAsync(async (req, res) => {
  let { id ,reviewId} =res.params;
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);

  res.redirect(`/listings/${id}`);
 
  })
);

module.exports = router;

