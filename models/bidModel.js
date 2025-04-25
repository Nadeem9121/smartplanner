// models/Bid.js
const mongoose = require("mongoose");

// Nested schema for budget range to ensure proper sibling validation
const BudgetSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      required: [true, "Budget minimum is required"],
      min: [0, "Budget min must be positive"],
    },
    max: {
      type: Number,
      required: [true, "Budget maximum is required"],
      min: [0, "Budget max must be positive"],
      validate: {
        validator: function (v) {
          // 'this' refers to the BudgetSchema instance
          return v >= this.min;
        },
        message: function (props) {
          return `Budget max (${props.value}) must be >= budget min (${this.min})`;
        },
      },
    },
  },
  { _id: false }
);

// Define schema for a bid/request
const bidSchema = new mongoose.Schema(
  {
    // Reference to the requesting user
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Details of the request
    requestDetails: {
      type: String,
      required: [true, "Request details are required"],
      trim: true,
    },

    // Timeline info: e.g., desired duration or deadline
    timeline: {
      type: String,
      trim: true,
    },

    // Preferred start date for the project
    preferredStartDate: {
      type: Date,
      required: [true, "Preferred start date is required"],
    },

    // Budget range: using nested subdocument to validate min/max properly
    budgetRange: {
      type: BudgetSchema,
      required: [true, "Budget range is required"],
    },

    // Optional filters for providers
    filters: {
      localVendorsOnly: {
        type: Boolean,
        default: false,
      },
      verifiedProvidersOnly: {
        type: Boolean,
        default: false,
      },
      minExperienceYears: {
        type: Number,
        default: 0,
        min: [0, "Experience must be non-negative"],
      },
    },

    // Status of the bid/request
    status: {
      type: String,
      enum: ["accept", "reject", "cancel", "pending"],
      default: "pending",
    },

    // Assignment: which provider accepted, if any
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index to quickly find open requests by date
bidSchema.index({ status: 1, preferredStartDate: 1 });

const Bid = mongoose.model("Bid", bidSchema);
module.exports = Bid;
