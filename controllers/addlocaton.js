const mongoose = require("mongoose");
const Service = require("../models/serviceModel"); // adjust path if needed
require("dotenv").config(); // Load DB connection string

(async () => {
  try {
    mongoose.set("strictQuery", true);
    mongoose
      .connect(
        "mongodb+srv://smart:n5fcEH36cNN2Uv4@cluster0.pzj1cqc.mongodb.net/smartPlanner"
      )
      .then(() => console.log("DB connection successful!"))
      .catch((err) => {
        console.error("DB connection error", err);
        process.exit(1);
      });

    const services = await Service.find();

    if (services.length === 0) {
      console.log("No services found.");
      return mongoose.connection.close();
    }

    const updates = services.map((service) => {
      service.location = "Karachi"; // ✅ Force update
      return service.save();
    });

    await Promise.all(updates);
    console.log(`${services.length} services updated with location "Karachi".`);

    mongoose.connection.close();
  } catch (err) {
    console.error("Error updating services:", err);
    mongoose.connection.close();
  }
})();
