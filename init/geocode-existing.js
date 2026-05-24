const mongoose = require("mongoose");
const Listing = require("../models/listing");

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderful";

async function main() {
  await mongoose.connect(MONGO_URL);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const geocodeAll = async () => {
  const listings = await Listing.find({});
  console.log(`Found ${listings.length} listings in DB. Geocoding existing records...`);

  for (let listing of listings) {
    const query = `${listing.location}, ${listing.country}`;
    console.log(`Geocoding: "${query}" (Listing: "${listing.title}")`);
    
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "WonderFull-Hotel-Booking-App-Geocode-Migration"
        }
      });
      const data = await response.json();
      
      if (data && data.length > 0) {
        listing.geometry = {
          type: "Point",
          coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)]
        };
        await listing.save();
        console.log(`  ✅ Geocoded: [${data[0].lon}, ${data[0].lat}]`);
      } else {
        console.log(`  ⚠️ No geocoding result found for: "${query}"`);
      }
    } catch (err) {
      console.error(`  ❌ Error:`, err.message);
    }
    
    // Respect Nominatim's request limit of 1 request per second
    await sleep(1000);
  }
};

main()
  .then(async () => {
    console.log("Connected to DB");
    await geocodeAll();
    await mongoose.connection.close();
    console.log("Database connection closed. Migration finished successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
