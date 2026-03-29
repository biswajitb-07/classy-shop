import mongoose from "mongoose";

const preferenceEntrySchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const recentQuerySchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    intent: {
      type: String,
      default: "",
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const behaviorProductSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    subCategory: {
      type: String,
      default: "",
      trim: true,
    },
    thirdLevelCategory: {
      type: String,
      default: "",
      trim: true,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const viewedCategorySchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      default: "category",
      trim: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const aiUserMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    preferences: {
      categories: {
        type: [preferenceEntrySchema],
        default: [],
      },
      priceRanges: {
        type: [preferenceEntrySchema],
        default: [],
      },
      brands: {
        type: [preferenceEntrySchema],
        default: [],
      },
      budgetLevel: {
        type: String,
        default: "",
        trim: true,
      },
    },
    recentQueries: {
      type: [recentQuerySchema],
      default: [],
    },
    behaviorSignals: {
      clickedProducts: {
        type: [behaviorProductSchema],
        default: [],
      },
      viewedCategories: {
        type: [viewedCategorySchema],
        default: [],
      },
    },
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "ai_user_memory",
  },
);

export const AiUserMemory = mongoose.model("AiUserMemory", aiUserMemorySchema);
