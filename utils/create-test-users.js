const mongoose = require("mongoose");
const User = require("../models/user");
const Listing = require("../models/listing");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const MONGO_URL = process.env.ATLASDB_URL || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/wonderful";

async function run() {
  console.log("📡 Connecting to DB...");
  await mongoose.connect(MONGO_URL);
  console.log("✅ Connected to DB");

  // 1. Create Host User
  let host = await User.findOne({ username: "test_host" });
  if (!host) {
    console.log("👤 Registering host user: test_host...");
    const newHost = new User({
      email: "host@wonderfull.com",
      username: "test_host",
      bio: "Professional vacation rental host with 5 years experience.",
      phone: "+91 9876543210"
    });
    host = await User.register(newHost, "testpassword");
    console.log("✅ Registered test_host successfully");
  } else {
    console.log("ℹ️ test_host already exists");
  }

  // 2. Create Guest User
  let guest = await User.findOne({ username: "test_guest" });
  if (!guest) {
    console.log("👤 Registering guest user: test_guest...");
    const newGuest = new User({
      email: "guest@wonderfull.com",
      username: "test_guest",
      bio: "Avid traveler looking for premium stays.",
      phone: "+91 9998887776"
    });
    guest = await User.register(newGuest, "testpassword");
    console.log("✅ Registered test_guest successfully");
  } else {
    console.log("ℹ️ test_guest already exists");
  }

  // 3. Create a listing specifically owned by test_host
  let listing = await Listing.findOne({ title: "Premium Sea-View Villa Goa" });
  if (!listing) {
    console.log("🏡 Seeding a test listing owned by test_host...");
    listing = new Listing({
      title: "Premium Sea-View Villa Goa",
      description: "Experience absolute luxury with a private infinity pool overlooking the Arabian Sea. This villa features state-of-the-art automation, automated glass windows, high-speed WiFi, and 24/7 private concierge. Perfect for family getaways and travelers looking for visually stunning landscapes.",
      price: 25000,
      location: "Candolim, Goa",
      country: "India",
      category: "Luxury",
      amenities: ["WiFi", "AC", "Pool", "Spa", "Bar", "Parking", "Gym", "Breakfast"],
      owner: host._id,
      image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop",
      images: [
        {
          url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop",
          filename: "test_villa_1"
        }
      ],
      geometry: {
        type: "Point",
        coordinates: [73.7667, 15.5167] // Candolim, Goa coord
      }
    });
    await listing.save();
    console.log("✅ Seeding test listing successful!");
  } else {
    console.log("ℹ️ Premium Sea-View Villa Goa already exists");
  }

  console.log("\n==================================================================");
  console.log("🎉 SUCCESS: Test Accounts Seeding Completed!");
  console.log("==================================================================");
  console.log("🔐 Credentials:");
  console.log("   - Host Username:  test_host");
  console.log("   - Guest Username: test_guest");
  console.log("   - Password:       testpassword");
  console.log("\n🌐 Test Steps:");
  console.log("   1. Open localhost:8080 in a Normal browser window.");
  console.log("   2. Log in as user 'test_guest'.");
  console.log("   3. Open localhost:8080 in an Incognito/Private window.");
  console.log("   4. Log in as user 'test_host'.");
  console.log("   5. In the Guest window, find the 'Premium Sea-View Villa Goa' listing.");
  console.log("   6. Book dates & chat with the host to test real-time Socket.io!");
  console.log("==================================================================\n");

  await mongoose.disconnect();
}

run().catch(console.error);
