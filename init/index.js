const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const MONGO_URL = process.env.ATLASDB_URL || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/wonderful";

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

  // Map listings to contain owner ID, category, and default geometry (New Delhi)
  const listingsWithOwner = initData.data.map((obj) => {
    const text = (obj.title + " " + obj.description).toLowerCase();
    let category = "Other";
    if (text.includes("beach") || text.includes("ocean") || text.includes("sea") || text.includes("lakefront") || text.includes("water") || text.includes("shore") || text.includes("surf")) {
      category = "Beach";
    } else if (text.includes("mountain") || text.includes("alpine") || text.includes("ski") || text.includes("slope") || text.includes("chalet") || text.includes("hill") || text.includes("peaks")) {
      category = "Mountain";
    } else if (text.includes("loft") || text.includes("downtown") || text.includes("penthouse") || text.includes("apartment") || text.includes("tokyo") || text.includes("city") || text.includes("urban")) {
      category = "City";
    } else if (text.includes("retreat") || text.includes("nature") || text.includes("wood") || text.includes("forest") || text.includes("secluded") || text.includes("cottage") || text.includes("cabin")) {
      category = "Countryside";
    } else if (text.includes("luxury") || text.includes("villa") || text.includes("private island") || text.includes("opulent") || text.includes("exclusive")) {
      category = "Luxury";
    } else if (text.includes("budget") || text.includes("hostel") || text.includes("cheap") || text.includes("backpacker") || text.includes("rustic")) {
      category = "Budget";
    } else if (text.includes("treehouse") || text.includes("treetop")) {
      category = "Treehouse";
    } else if (text.includes("historic") || text.includes("castle") || text.includes("history") || text.includes("heritage") || text.includes("brownstone") || text.includes("monument")) {
      category = "Historic";
    }

    return {
      ...obj,
      owner: adminUser._id,
      category: category,
      geometry: {
        type: "Point",
        coordinates: [77.209, 28.613] // default to New Delhi, India [longitude, latitude]
      }
    };
  });

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
