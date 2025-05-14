// models/bidModel.js
const mongoose = require("mongoose");

// Budget schema (unchanged)
const BudgetSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 0 },
    max: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(v) {
          return v >= this.min;
        },
        message: (props) =>
          `Budget max (${props.value}) must be ≥ min (${this.min})`,
      },
    },
  },
  { _id: false }
);

// Full list of categories (same as User model)
const SERVICE_CATEGORIES = [
  /* … all 80+ categories from Step 1 … */
];

const bidSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestDetails: { type: String, required: true, trim: true },
    timeline: { type: String, trim: true },
    preferredStartDate: { type: Date, required: true },
    budgetRange: { type: BudgetSchema, required: true },

    filters: {
      localVendorsOnly: { type: Boolean, default: false },
      verifiedProvidersOnly: { type: Boolean, default: false },
      minExperienceYears: { type: Number, default: 0, min: 0 },
    },

    // ← New category field
    category: {
      type: String,
      required: [true, "Service category is required"],
      enum: SERVICE_CATEGORIES,
      index: true,
    },

    status: {
      type: String,
      enum: ["accept", "reject", "cancel", "pending"],
      default: "pending",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Quotes array for vendor bids
    quotes: [
      {
        vendor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

// Compound index on status + date (unchanged)
bidSchema.index({ status: 1, preferredStartDate: 1 });

module.exports = mongoose.model("Bid", bidSchema);
