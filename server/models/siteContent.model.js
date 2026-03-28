import mongoose from "mongoose";

const bannerBoxSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "Promotional banner" },
    titleLines: {
      type: [String],
      default: [],
      validate: {
        validator: (lines) => Array.isArray(lines) && lines.length > 0,
        message: "At least one title line is required.",
      },
    },
    price: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
    textPosition: {
      type: String,
      enum: ["left", "right"],
      default: "left",
    },
    ctaLabel: { type: String, trim: true, default: "show more" },
  },
  { _id: true }
);

const homeSlideSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "Homepage slider banner" },
    link: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const heroSlideSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "Hero banner" },
    eyebrow: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, required: true },
    subtitle: { type: String, trim: true, default: "" },
    priceLabel: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const promoBannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "Promo banner" },
    title: { type: String, trim: true, required: true },
    price: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
    overlayDirection: {
      type: String,
      enum: ["left", "right"],
      default: "left",
    },
    textAlign: {
      type: String,
      enum: ["left", "right"],
      default: "left",
    },
    ctaLabel: { type: String, trim: true, default: "Show More" },
  },
  { _id: true }
);

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" },
    content: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const blogPostSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    dateLabel: { type: String, required: true, trim: true },
    link: { type: String, trim: true, default: "" },
    ctaLabel: { type: String, trim: true, default: "READ MORE" },
  },
  { _id: true }
);

const siteContentSchema = new mongoose.Schema(
  {
    homeSlides: { type: [homeSlideSchema], default: [] },
    bannerBoxes: { type: [bannerBoxSchema], default: [] },
    heroSlides: { type: [heroSlideSchema], default: [] },
    promoBanners: { type: [promoBannerSchema], default: [] },
    testimonials: { type: [testimonialSchema], default: [] },
    blogPosts: { type: [blogPostSchema], default: [] },
  },
  { timestamps: true }
);

export const SiteContent = mongoose.model("SiteContent", siteContentSchema);
