const mongoose = require("mongoose");
const Booking = require("./models/booking");

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderful";

async function main() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to DB");
  
  const bookings = await Booking.find({});
  console.log("Total Bookings:", bookings.length);
  for (let booking of bookings) {
    console.log({
      id: booking._id,
      status: booking.status,
      checkIn: booking.checkIn,
      totalPrice: booking.totalPrice,
      paymentId: booking.paymentId
    });
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
