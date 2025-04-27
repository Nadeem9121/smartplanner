// models/userModel.js
const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const SERVICE_CATEGORIES = [
  "Wedding Planning",
  "Birthday Party Planning",
  "Baby Shower Planning",
  "Engagement Party Planning",
  "Bridal Shower Planning",
  "Anniversary Party Planning",
  "Corporate Event Planning",
  "Product Launch Events",
  "Gala Dinners",
  "Award Ceremonies",
  "Charity Fundraisers",
  "Graduation Parties",
  "Farewell Parties",
  "Housewarming Parties",
  "Holiday Parties (Christmas, Halloween, Eid, etc.)",
  "Religious Ceremonies",
  "Festivals and Fairs",
  "Bachelor / Bachelorette Parties",
  "Sweet 16 / Quinceañera",
  "Retirement Parties",
  "Cultural Events (Mehndi, Sangeet, etc.)",
  "Full-Service Catering",
  "Buffet Catering",
  "Cocktail Reception Catering",
  "Dessert Table Catering",
  "Live Food Stations (BBQ, Tandoor, Pasta Stations, etc.)",
  "Food Truck Catering",
  "Cake and Bakery Services",
  "Bartending Services",
  "Beverage Stations (Tea, Coffee, Mocktails, Juices)",
  "Live Bands",
  "DJs",
  "Stand-up Comedians",
  "Emcees / Hosts",
  "Magicians",
  "Dancers (Cultural, Hip-Hop, Ballet)",
  "Fire Shows",
  "Kids’ Entertainment (Clowns, Face Painting, Puppet Shows)",
  "Celebrity Appearances",
  "Motivational Speakers",
  "Wedding Decor",
  "Themed Birthday Decor",
  "Stage Decoration",
  "Floral Arrangements",
  "Balloon Decoration",
  "Lighting and Effects (LEDs, Chandeliers, Fairy Lights)",
  "Photo Booth Setup",
  "Table Settings and Centerpieces",
  "Backdrop Design",
  "Lounge Furniture Rentals",
  "Event Photography",
  "Wedding Films",
  "Live Streaming Services",
  "Drone Videography",
  "Instant Photo Printing",
  "360-Degree Photo Booths",
  "Event Rentals (Tents, Chairs, Tables)",
  "Sound and Lighting Equipment Rental",
  "Stage Setup and AV Management",
  "Transportation (Guest Shuttles, Limos, Vintage Cars)",
  "Security Services",
  "Valet Parking",
  "Cleaning Services",
  "Power Backup (Generators)",
  "Permit and License Handling",
  "Makeup Artists",
  "Hair Stylists",
  "Mehndi / Henna Artists",
  "Styling Services",
  "Personal Shoppers",
  "Custom Invitation Cards",
  "Return Gifts",
  "Event Souvenirs",
  "Wedding Favors",
  "Digital Invitations (E-invites)",
];

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Please tell us your name!"] },
  phoneNum: {
    type: String,
    required: [true, "Phone number is required."],
    validate: {
      validator: (val) => /^\+?[1-9]\d{9,14}$/.test(val),
      message: "Invalid phone number.",
    },
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  photo: { type: String, default: "default.jpg" },
  role: { type: String, enum: ["user", "vendor", "admin"], default: "user" },

  categories: {
    type: [String],
    enum: SERVICE_CATEGORIES, // Make sure this is the imported array
    default: [],
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: { type: Boolean, default: true, select: false },
});

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  //   // Delete passwordConfirm field
  //   this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
