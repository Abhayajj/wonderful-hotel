const mongoose = require("mongoose");
const Listing = require("../models/listing");
const Review = require("../models/review");

describe("Mongoose Model Schema Validation Tests", () => {
  test("Listing schema validation should fail if required fields are missing", () => {
    const listing = new Listing({
      description: "Missing title, price, location, country"
    });

    const err = listing.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.price).toBeDefined();
    expect(err.errors.location).toBeDefined();
    expect(err.errors.country).toBeDefined();
  });

  test("Review schema validation should fail if rating is less than 1 or greater than 5", () => {
    const reviewLow = new Review({
      comment: "Invalid rating",
      rating: 0
    });
    const errLow = reviewLow.validateSync();
    expect(errLow).toBeDefined();
    expect(errLow.errors.rating).toBeDefined();

    const reviewHigh = new Review({
      comment: "Invalid rating",
      rating: 6
    });
    const errHigh = reviewHigh.validateSync();
    expect(errHigh).toBeDefined();
    expect(errHigh.errors.rating).toBeDefined();
  });

  test("Review schema validation should pass with valid parameters", () => {
    const reviewValid = new Review({
      comment: "Excellent service",
      rating: 5
    });
    const err = reviewValid.validateSync();
    expect(err).toBeUndefined();
  });
});
