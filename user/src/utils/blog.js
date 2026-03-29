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

export const buildBlogNarrative = (post) => {
  const title = post?.title?.trim() || "Story";
  const excerpt = post?.excerpt?.trim() || "";

  return [
    excerpt,
    `${title} is about making everyday spaces, routines, and choices feel more thoughtful without losing comfort or practicality.`,
    `Use this story as inspiration to keep the foundation simple, focus on what improves mood and function, and then add details that make the final result feel complete.`,
  ].filter(Boolean);
};

export const buildBlogHighlights = (post) => {
  const title = post?.title?.trim() || "Design";

  return [
    `${title} works best when form and function stay balanced.`,
    "Start with the essentials, then layer in details with intention.",
    "Choose updates that improve both comfort and visual clarity.",
  ];
};
