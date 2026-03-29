import { SiteContent } from "../models/siteContent.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../utils/cloudinary.js";

const CURATED_TESTIMONIALS = [
  {
    name: "Riya Malhotra",
    role: "Home Decor Shopper",
    content:
      "I ordered decor pieces and soft furnishings for my apartment, and the entire experience felt premium. The product photos matched what I received, delivery was on time, and the finish quality made my living room look far more polished.",
  },
  {
    name: "Arjun Sen",
    role: "Tech Enthusiast",
    content:
      "What impressed me most was how easy it was to compare gadgets and check detailed specs before buying. The checkout was smooth, updates were clear, and customer support answered my questions without making me wait for hours.",
  },
  {
    name: "Neha Kapoor",
    role: "Repeat Customer",
    content:
      "I keep coming back because the store feels reliable. From fashion picks to everyday essentials, recommendations are relevant, returns are simple to understand, and the overall shopping journey feels thoughtful instead of confusing.",
  },
];

const CURATED_BLOG_POSTS = [
  {
    image: "/blog/blog-1.jpg",
    title: "5 Living Room Updates That Make a Small Space Feel Premium",
    excerpt:
      "From softer textures to smarter furniture placement, these practical living room updates can instantly make a compact home look brighter, calmer, and more expensive without a full redesign.",
    dateLabel: "12 FEBRUARY, 2026",
    link: "",
    ctaLabel: "READ MORE",
  },
  {
    image: "/blog/blog-2.jpg",
    title: "How Immersive Tech Is Changing At-Home Entertainment",
    excerpt:
      "VR headsets and smart wearables are no longer niche gadgets. Here is what to look for in comfort, display quality, audio, and everyday usability before bringing immersive tech home.",
    dateLabel: "4 MARCH, 2026",
    link: "",
    ctaLabel: "READ MORE",
  },
  {
    image: "/blog/blog-3.jpg",
    title: "Wireless Earbuds Buying Guide for Work, Travel, and Daily Use",
    excerpt:
      "The best earbuds are not only about sound quality. Fit, battery life, call clarity, and case design matter just as much when you want one pair that works through meetings, commutes, and workouts.",
    dateLabel: "18 MARCH, 2026",
    link: "",
    ctaLabel: "READ MORE",
  },
];

const LOCAL_DEFAULTS = {
  homeSlides: [
    {
      image: "/slide/slide-1.jpg",
      alt: "Homepage slide 1",
      link: "",
    },
    {
      image: "/slide/slide-2.jpg",
      alt: "Homepage slide 2",
      link: "",
    },
    {
      image: "/slide/slide-3.jpg",
      alt: "Homepage slide 3",
      link: "",
    },
    {
      image: "/slide/slide-4.jpg",
      alt: "Homepage slide 4",
      link: "",
    },
    {
      image: "/slide/slide-5.jpg",
      alt: "Homepage slide 5",
      link: "",
    },
    {
      image: "/slide/slide-6.jpg",
      alt: "Homepage slide 6",
      link: "",
    },
  ],
  bannerBoxes: [
    {
      image: "/banner/banner-1.jpg",
      alt: "Women's products",
      titleLines: ["Buy women", "products with low", "price"],
      price: "₹999",
      link: "",
      textPosition: "right",
      ctaLabel: "show more",
    },
    {
      image: "/banner/banner-2.png",
      alt: "Men's bags",
      titleLines: ["Buy Men's Bags", "with low price"],
      price: "₹900",
      link: "",
      textPosition: "left",
      ctaLabel: "show more",
    },
    {
      image: "/banner/banner-3.jpg",
      alt: "Apple iPhone",
      titleLines: ["Buy Apple Iphone"],
      price: "₹45000",
      link: "",
      textPosition: "left",
      ctaLabel: "show more",
    },
    {
      image: "/banner/banner-4.jpg",
      alt: "Men's footwear",
      titleLines: ["Buy Men's", "Footwear with", "low price"],
      price: "₹1500",
      link: "",
      textPosition: "right",
      ctaLabel: "show more",
    },
  ],
  heroSlides: [
    {
      image: "/mid-banner/banner-1.jpg",
      alt: "Women fashion hero",
      eyebrow: "Big Saving days sale",
      title: "Buy New Women Trend | Black",
      subtitle: "Top Cotton Blend Top",
      priceLabel: "₹1,500.00",
      link: "",
    },
    {
      image: "/mid-banner/banner-2.jpg",
      alt: "Apple iPhone hero",
      eyebrow: "Big Saving days sale",
      title: "Apple iPhone",
      subtitle: "13 128 GB, Pink",
      priceLabel: "₹35,000.00",
      link: "",
    },
  ],
  promoBanners: [
    {
      image: "/mid-banner/banner-3.jpg",
      alt: "Apple iPhone promo",
      title: "Buy Apple iPhone",
      price: "₹45,000",
      link: "",
      overlayDirection: "right",
      textAlign: "right",
      ctaLabel: "Show More",
    },
    {
      image: "/mid-banner/banner-4.jpg",
      alt: "Men's footwear promo",
      title: "Buy Men's Footwear",
      price: "₹1,500",
      link: "",
      overlayDirection: "left",
      textAlign: "left",
      ctaLabel: "Show More",
    },
  ],
  testimonials: [
    ...CURATED_TESTIMONIALS,
  ],
  blogPosts: [
    ...CURATED_BLOG_POSTS,
  ],
};

const IMAGE_SECTIONS = new Set([
  "homeSlides",
  "bannerBoxes",
  "heroSlides",
  "promoBanners",
  "blogPosts",
]);

const sectionConfig = {
  homeSlides: {
    parse: (body, image) => ({
      image,
      alt: body.alt?.trim() || "Homepage slider banner",
      link: body.link?.trim() || "",
    }),
  },
  bannerBoxes: {
    required: ["titleLines"],
    parse: (body, image) => ({
      image,
      alt: body.alt?.trim() || "Promotional banner",
      titleLines: splitLines(body.titleLines),
      price: body.price?.trim() || "",
      link: body.link?.trim() || "",
      textPosition: body.textPosition === "right" ? "right" : "left",
      ctaLabel: body.ctaLabel?.trim() || "show more",
    }),
  },
  heroSlides: {
    required: ["title"],
    parse: (body, image) => ({
      image,
      alt: body.alt?.trim() || "Hero banner",
      eyebrow: body.eyebrow?.trim() || "",
      title: body.title?.trim() || "",
      subtitle: body.subtitle?.trim() || "",
      priceLabel: body.priceLabel?.trim() || "",
      link: body.link?.trim() || "",
    }),
  },
  promoBanners: {
    required: ["title"],
    parse: (body, image) => ({
      image,
      alt: body.alt?.trim() || "Promo banner",
      title: body.title?.trim() || "",
      price: body.price?.trim() || "",
      link: body.link?.trim() || "",
      overlayDirection:
        body.overlayDirection === "right" ? "right" : "left",
      textAlign: body.textAlign === "right" ? "right" : "left",
      ctaLabel: body.ctaLabel?.trim() || "Show More",
    }),
  },
  testimonials: {
    required: ["name", "content"],
    parse: (body) => ({
      name: body.name?.trim() || "",
      role: body.role?.trim() || "",
      content: body.content?.trim() || "",
    }),
  },
  blogPosts: {
    required: ["title", "excerpt", "dateLabel"],
    parse: (body, image) => ({
      image,
      title: body.title?.trim() || "",
      excerpt: body.excerpt?.trim() || "",
      dateLabel: body.dateLabel?.trim() || "",
      link: body.link?.trim() || "",
      ctaLabel: body.ctaLabel?.trim() || "READ MORE",
    }),
  },
};

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isCloudinaryAsset(url = "") {
  return url.includes("res.cloudinary.com");
}

function extractCloudinaryPublicId(url = "") {
  if (!isCloudinaryAsset(url)) return "";
  const uploadPart = url.split("/upload/")[1];
  return uploadPart?.replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "") || "";
}

async function deleteCloudinaryAssetByUrl(url = "") {
  const publicId = extractCloudinaryPublicId(url);
  if (publicId) {
    await deleteMediaFromCloudinary(publicId);
  }
}

async function ensureSiteContent() {
  let content = await SiteContent.findOne();
  if (!content) {
    content = await SiteContent.create(LOCAL_DEFAULTS);
    return content;
  }

  const didNormalize = normalizeLegacyContent(content);
  if (didNormalize) {
    await content.save();
  }

  return content;
}

function normalizeImagePath(url = "") {
  return String(url)
    .toLowerCase()
    .split("?")[0]
    .replace(/\\/g, "/");
}

function getCuratedBlogByImage(image = "", index = 0) {
  const normalizedImage = normalizeImagePath(image);
  const matchedPost = CURATED_BLOG_POSTS.find((post) =>
    normalizedImage.endsWith(normalizeImagePath(post.image))
  );

  return matchedPost || CURATED_BLOG_POSTS[index % CURATED_BLOG_POSTS.length];
}

function isLegacyTestimonial(item = {}) {
  const signature = `${item.name || ""} ${item.role || ""} ${item.content || ""}`;
  return /patrick goodman|lules charls|jacob goeckno|lorem ipsum|galley of type|desktop publishing|letraset/i.test(
    signature
  );
}

function isLegacyBlogPost(item = {}) {
  const signature = `${item.title || ""} ${item.excerpt || ""} ${item.dateLabel || ""}`;
  return (
    /\bnullam ullamcorper ornare molestie\b/i.test(signature) ||
    (String(item.title || "").trim().toLowerCase() === "living room" &&
      String(item.dateLabel || "").trim().toUpperCase() === "5 APRIL, 2023")
  );
}

function normalizeLegacyContent(content) {
  let changed = false;

  if ((content.testimonials || []).some(isLegacyTestimonial)) {
    content.testimonials = (content.testimonials || []).map((item, index) => {
      if (!isLegacyTestimonial(item)) return item;
      changed = true;
      return CURATED_TESTIMONIALS[index % CURATED_TESTIMONIALS.length];
    });
  }

  if ((content.blogPosts || []).some(isLegacyBlogPost)) {
    content.blogPosts = (content.blogPosts || []).map((item, index) => {
      if (!isLegacyBlogPost(item)) return item;

      changed = true;
      const curated = getCuratedBlogByImage(item.image, index);

      return {
        image: item.image || curated.image,
        title: curated.title,
        excerpt: curated.excerpt,
        dateLabel: curated.dateLabel,
        link: item.link || curated.link,
        ctaLabel: item.ctaLabel || curated.ctaLabel,
      };
    });
  }

  return changed;
}

function validateSection(section) {
  if (!sectionConfig[section]) {
    const error = new Error("Invalid content section.");
    error.statusCode = 400;
    throw error;
  }
}

function validateRequiredFields(section, payload) {
  const requiredFields = sectionConfig[section].required || [];
  const missingField = requiredFields.find((field) => {
    if (field === "titleLines") {
      return !Array.isArray(payload.titleLines) || payload.titleLines.length === 0;
    }
    return !payload[field];
  });

  if (missingField) {
    const error = new Error(`Missing required field: ${missingField}`);
    error.statusCode = 400;
    throw error;
  }
}

async function resolveImage(section, req) {
  if (!IMAGE_SECTIONS.has(section)) return undefined;

  if (!req.file) {
    const error = new Error("Please upload an image.");
    error.statusCode = 400;
    throw error;
  }

  if (req.file.size > 10 * 1024 * 1024) {
    const error = new Error("File size exceeds the 10MB limit.");
    error.statusCode = 400;
    throw error;
  }

  const uploadResult = await uploadMediaVendor(req.file);
  return uploadResult?.secure_url;
}

async function resolveOptionalImage(section, req, existingImage = "") {
  if (!IMAGE_SECTIONS.has(section)) return existingImage;
  if (!req.file) return existingImage;

  if (req.file.size > 10 * 1024 * 1024) {
    const error = new Error("File size exceeds the 10MB limit.");
    error.statusCode = 400;
    throw error;
  }

  const uploadResult = await uploadMediaVendor(req.file);
  return uploadResult?.secure_url || existingImage;
}

function normalizeResponse(content) {
  return {
    homeSlides: content.homeSlides || [],
    bannerBoxes: content.bannerBoxes || [],
    heroSlides: content.heroSlides || [],
    promoBanners: content.promoBanners || [],
    testimonials: content.testimonials || [],
    blogPosts: content.blogPosts || [],
  };
}

export const getPublicSiteContent = async (_req, res) => {
  try {
    const content = await ensureSiteContent();
    res.status(200).json({
      success: true,
      content: normalizeResponse(content),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch site content.",
    });
  }
};

export const getAdminSiteContent = async (_req, res) => {
  try {
    const content = await ensureSiteContent();
    res.status(200).json({
      success: true,
      content: normalizeResponse(content),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch site content.",
    });
  }
};

export const addSiteContentItem = async (req, res) => {
  try {
    const { section } = req.params;
    validateSection(section);

    const content = await ensureSiteContent();
    const image = await resolveImage(section, req);
    const item = sectionConfig[section].parse(req.body, image);
    validateRequiredFields(section, item);

    content[section].push(item);
    await content.save();

    res.status(201).json({
      success: true,
      message: "Content item added successfully.",
      items: content[section],
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to add content item.",
    });
  }
};

export const deleteSiteContentItem = async (req, res) => {
  try {
    const { section, itemId } = req.params;
    validateSection(section);

    const content = await ensureSiteContent();
    const existingItem = content[section].id(itemId);

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Content item not found.",
      });
    }

    if (IMAGE_SECTIONS.has(section)) {
      await deleteCloudinaryAssetByUrl(existingItem.image);
    }

    content[section].pull({ _id: itemId });
    await content.save();

    res.status(200).json({
      success: true,
      message: "Content item deleted successfully.",
      items: content[section],
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete content item.",
    });
  }
};

export const updateSiteContentItem = async (req, res) => {
  try {
    const { section, itemId } = req.params;
    validateSection(section);

    const content = await ensureSiteContent();
    const existingItem = content[section].id(itemId);

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Content item not found.",
      });
    }

    const previousImage = existingItem.image || "";
    const image = await resolveOptionalImage(section, req, previousImage);
    const parsedItem = sectionConfig[section].parse(req.body, image);
    validateRequiredFields(section, parsedItem);

    Object.entries(parsedItem).forEach(([key, value]) => {
      existingItem[key] = value;
    });

    await content.save();

    if (
      IMAGE_SECTIONS.has(section) &&
      req.file &&
      previousImage &&
      previousImage !== image
    ) {
      await deleteCloudinaryAssetByUrl(previousImage);
    }

    res.status(200).json({
      success: true,
      message: "Content item updated successfully.",
      items: content[section],
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update content item.",
    });
  }
};
