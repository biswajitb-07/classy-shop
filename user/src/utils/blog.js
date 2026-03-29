const normalizeSegment = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getBlogSlug = (post, index = 0) => {
  const titleSlug = normalizeSegment(post?.title || "");
  const stableId = normalizeSegment(post?._id || "");

  if (stableId) {
    return `${titleSlug || "blog-post"}-${stableId}`;
  }

  return `${titleSlug || "blog-post"}-${index + 1}`;
};

export const getBlogPath = (post, index = 0) =>
  `/blog/${getBlogSlug(post, index)}`;

export const findBlogPostBySlug = (posts = [], slug = "") =>
  posts.find((post, index) => getBlogSlug(post, index) === slug) || null;

export const estimateBlogReadingTime = (post) => {
  const wordCount = `${post?.title || ""} ${post?.excerpt || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(2, Math.ceil(wordCount / 90));
};

const getBlogTheme = (post) => {
  const signature = `${post?.title || ""} ${post?.excerpt || ""}`.toLowerCase();

  if (
    signature.includes("living room") ||
    signature.includes("space feel premium") ||
    signature.includes("furniture")
  ) {
    return "interiors";
  }

  if (
    signature.includes("vr") ||
    signature.includes("immersive") ||
    signature.includes("wearable") ||
    signature.includes("entertainment")
  ) {
    return "tech";
  }

  if (
    signature.includes("earbuds") ||
    signature.includes("audio") ||
    signature.includes("battery life") ||
    signature.includes("call clarity")
  ) {
    return "audio";
  }

  return "general";
};

export const buildBlogNarrative = (post) => {
  const excerpt = post?.excerpt?.trim() || "";
  const theme = getBlogTheme(post);

  if (theme === "interiors") {
    return [
      excerpt,
      "A refined living room rarely comes from buying more items. It usually comes from making better decisions with layout, light, and texture. A clean seating arrangement, warmer neutrals, and one or two standout materials can make even a smaller room feel calm and expensive.",
      "Start with the basics first: clear walking space, balanced furniture proportions, and lighting that works in layers. Once the room feels functional, add softness through throws, cushions, natural wood, or subtle metal accents so the finished look feels intentional instead of crowded.",
    ].filter(Boolean);
  }

  if (theme === "tech") {
    return [
      excerpt,
      "Immersive devices are becoming practical household tech, not just novelty purchases. A good headset should feel comfortable for longer sessions, offer clear visuals, and stay easy to set up without turning every use into a technical task.",
      "Before buying, focus on fit, display sharpness, audio isolation, controller comfort, and how naturally the device fits into your daily routine. The best tech products are the ones that feel exciting at first and still feel easy to live with a month later.",
    ].filter(Boolean);
  }

  if (theme === "audio") {
    return [
      excerpt,
      "Wireless earbuds work best when they match the way you actually use them. Strong audio matters, but long battery life, stable connectivity, and a comfortable seal matter just as much if you wear them through work calls, travel, and quick workouts.",
      "Look closely at microphone quality, charging case size, ear-tip fit, and whether touch controls are simple enough to use on the move. The right pair should disappear into your routine rather than constantly needing adjustment or recharging.",
    ].filter(Boolean);
  }

  return [
    excerpt,
    "The most useful buying and style stories are the ones that stay practical. They help you understand what matters first, where quality makes a visible difference, and how to make choices that still feel relevant after the first impression wears off.",
    "When you read any guide, focus on details that improve real daily use: comfort, durability, simplicity, and whether the product or update actually solves the problem you are shopping for.",
  ].filter(Boolean);
};

export const buildBlogHighlights = (post) => {
  const theme = getBlogTheme(post);

  if (theme === "interiors") {
    return [
      "Prioritize layout, natural light, and furniture scale first.",
      "Layer texture through fabric, wood, and a few clean accents.",
      "Avoid overcrowding so the room feels premium and breathable.",
    ];
  }

  if (theme === "tech") {
    return [
      "Check comfort and fit before chasing only top-end specs.",
      "Display clarity and low-latency audio shape the real experience.",
      "Choose devices that stay easy to use after the first week.",
    ];
  }

  if (theme === "audio") {
    return [
      "Fit and call quality matter as much as pure sound tuning.",
      "Battery life should suit workdays, travel, and workouts.",
      "Compact cases and reliable controls improve everyday use.",
    ];
  }

  return [
    "Look for value that improves daily use, not just appearance.",
    "Buy with comfort, clarity, and durability in mind.",
    "Keep choices practical so they stay satisfying for longer.",
  ];
};
