const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderful";

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  // Clear listings and reviews
  await Listing.deleteMany({});
  
  // Find or create admin user
  let adminUser = await User.findOne({ username: "admin" });
  if (!adminUser) {
    const newAdmin = new User({
      email: "admin@wonderfull.com",
      username: "admin"
    });
    adminUser = await User.register(newAdmin, "adminpassword");
    console.log("Created default admin user.");
  } else {
    console.log("Admin user already exists.");
  }

  // Map listings to contain owner ID and default geometry (New Delhi)
  const listingsWithOwner = initData.data.map((obj) => ({
    ...obj,
    owner: adminUser._id,
    geometry: {
      type: "Point",
      coordinates: [77.209, 28.613] // default to New Delhi, India [longitude, latitude]
    }
  }));

  await Listing.insertMany(listingsWithOwner);
  console.log("data was initialized");
};

main()
  .then(async () => {
    console.log("connected to DB");
    await initDB();
    await mongoose.connection.close();
    console.log("database connection closed");
  })
  .catch((err) => {
    console.log(err);
  });
