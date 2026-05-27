const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  profileImage: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  },
  phone: {
    type: String,
    default: "",
  },
  adEarnings: {
    type: Number,
    default: 0,
  },
  adImpressions: {
    type: Number,
    default: 0,
  },
  adClicks: {
    type: Number,
    default: 0,
  },
  googleId: {
    type: String,
  },
  facebookId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.plugin(passportLocalMongoose, {
  findByUsername: function(model, queryParameters) {
    let searchKey = queryParameters.username;
    if (!searchKey && queryParameters.$or && queryParameters.$or[0]) {
      searchKey = queryParameters.$or[0].username;
    }
    return model.findOne({
      $or: [
        { username: searchKey },
        { email: searchKey }
      ]
    });
  }
});

module.exports = mongoose.model("User", userSchema);
