const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const companyPages = {
  delivery: {
    slug: "delivery",
    title: "Delivery Information",
    eyebrow: "Shipping support",
    theme: {
      shell:
        "bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#eff6ff_100%)]",
      badge: "bg-slate-950 text-white",
      accent: "text-orange-500",
      card: "bg-white border-slate-200",
    },
    description:
      "Learn how CLASSYSHOP handles order processing, shipping timelines, and delivery updates for every product category.",
    highlights: [
      "Orders are usually processed within 24-48 hours after payment confirmation.",
      "Delivery timeline depends on product category, stock readiness, and shipping location.",
      "Users can track order progress from order history and order details pages.",
    ],
    faqs: [
      {
        question: "How do I know my order status?",
        answer:
          "Open your account order section to view pending, processing, shipped, out for delivery, delivered, or cancelled updates.",
      },
      {
        question: "Do all products ship at the same speed?",
        answer:
          "No. Fashion, grocery, electronics, and specialty categories can have different packaging and dispatch times.",
      },
    ],
  },
  "legal-notice": {
    slug: "legal-notice",
    title: "Legal Notice",
    eyebrow: "Store policy",
    theme: {
      shell:
        "bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_35%,#ecfeff_100%)]",
      badge: "bg-cyan-950 text-white",
      accent: "text-cyan-600",
      card: "bg-white border-cyan-100",
    },
    description:
      "This page explains platform usage responsibilities, content ownership, account expectations, and compliance basics for CLASSYSHOP users.",
    highlights: [
      "Users must provide accurate information while creating accounts and placing orders.",
      "Product content, branding, and platform visuals remain protected by applicable rights and platform ownership.",
      "Misuse, abusive activity, or fraudulent behavior may result in account restriction or blocking.",
    ],
    faqs: [
      {
        question: "Can my account be restricted?",
        answer:
          "Yes. Accounts involved in fraudulent orders, spam, abuse, or policy violations may be blocked or limited.",
      },
      {
        question: "Who owns product and platform content?",
        answer:
          "CLASSYSHOP branding, designs, and protected content remain subject to platform ownership and applicable rights.",
      },
    ],
  },
  terms: {
    slug: "terms",
    title: "Terms And Conditions Of Use",
    eyebrow: "Usage terms",
    theme: {
      shell:
        "bg-[linear-gradient(135deg,#fdf4ff_0%,#ffffff_40%,#eef2ff_100%)]",
      badge: "bg-violet-950 text-white",
      accent: "text-violet-600",
      card: "bg-white border-violet-100",
    },
    description:
      "These terms outline how shoppers interact with the platform, how orders are handled, and what responsibilities apply to all users.",
    highlights: [
      "By using the website, users agree to follow checkout, payment, and account rules.",
      "Orders are subject to product availability, vendor catalog updates, and platform review rules.",
      "Returns, cancellations, and order issues must follow the workflow shown inside the platform.",
    ],
    faqs: [
      {
        question: "Can products become unavailable after I browse them?",
        answer:
          "Yes. Inventory can change in real time based on purchases, vendor updates, or restocking.",
      },
      {
        question: "Do the prices always stay fixed?",
        answer:
          "Prices and discounts may change based on vendor updates, offers, and stock movement.",
      },
    ],
  },
  "about-us": {
    slug: "about-us",
    title: "About Us",
    eyebrow: "Who we are",
    theme: {
      shell:
        "bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_40%,#eff6ff_100%)]",
      badge: "bg-emerald-950 text-white",
      accent: "text-emerald-600",
      card: "bg-white border-emerald-100",
    },
    description:
      "CLASSYSHOP is a multi-category ecommerce platform built to connect shoppers with fashion, electronics, grocery, beauty, wellness, footwear, jewellery, and bag products.",
    highlights: [
      "The platform supports users, vendors, and smart storefront experiences in one ecosystem.",
      "Customers can browse multiple categories, manage wishlist and cart, and track orders from a single account.",
      "Vendors manage products, analytics, orders, and customer demand through a dedicated dashboard.",
    ],
    faqs: [
      {
        question: "What does CLASSYSHOP sell?",
        answer:
          "The website supports fashion, electronics, bags, groceries, footwear, beauty, wellness, and jewellery products.",
      },
      {
        question: "Is this a multi-vendor platform?",
        answer:
          "Yes. Vendors can manage products and orders through their own dashboard while users shop from the shared storefront.",
      },
    ],
  },
  "secure-payment": {
    slug: "secure-payment",
    title: "Secure Payment",
    eyebrow: "Payment help",
    theme: {
      shell:
        "bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_35%,#fdf2f8_100%)]",
      badge: "bg-blue-950 text-white",
      accent: "text-blue-600",
      card: "bg-white border-blue-100",
    },
    description:
      "CLASSYSHOP supports secure checkout flows and payment-aware order handling for shoppers across supported payment methods.",
    highlights: [
      "Checkout is designed to support secure payment flows and order confirmation logic.",
      "Users should verify order amount, delivery address, and payment method before placing the order.",
      "Payment-related issues should be checked through the order details page or support flow.",
    ],
    faqs: [
      {
        question: "Which payment methods are available?",
        answer:
          "The platform supports methods configured during checkout, including COD and digital payment flows where enabled.",
      },
      {
        question: "How do I confirm payment success?",
        answer:
          "After successful checkout, the order appears in your order list with amount, payment mode, and order status.",
      },
    ],
  },
};

export const companyPageList = [
  { label: "Delivery", slug: "delivery" },
  { label: "Legal Notice", slug: "legal-notice" },
  { label: "Terms And Conditions Of Use", slug: "terms" },
  { label: "About Us", slug: "about-us" },
  { label: "Secure Payment", slug: "secure-payment" },
];

const productIntentMap = [
  { terms: ["vegetable", "vegetables", "veggie", "veggies", "fruit", "rice", "grocery", "groceries"], category: "Grocery" },
  { terms: ["shoe", "shoes", "sneaker", "heels", "footwear", "sandals"], category: "Footwear" },
  { terms: ["phone", "mobile", "laptop", "camera", "electronic", "electronics", "gadget"], category: "Electronics" },
  { terms: ["dress", "shirt", "jeans", "kurta", "fashion", "outfit"], category: "Fashion" },
  { terms: ["bag", "backpack", "purse", "wallet"], category: "Bag" },
  { terms: ["beauty", "skincare", "makeup", "cosmetic"], category: "Beauty" },
  { terms: ["wellness", "protein", "supplement", "health"], category: "Wellness" },
  { terms: ["ring", "necklace", "jewellery", "jewel", "chain"], category: "Jewellery" },
];

const specificProductIntentMap = [
  { terms: ["laptop", "notebook", "macbook"], label: "laptop", category: "Electronics" },
  { terms: ["phone", "mobile", "smartphone", "iphone"], label: "phone", category: "Electronics" },
  { terms: ["camera", "dslr", "mirrorless"], label: "camera", category: "Electronics" },
  { terms: ["headphone", "headphones", "earbuds", "earphone"], label: "audio product", category: "Electronics" },
  { terms: ["watch", "smartwatch"], label: "watch", category: "Electronics" },
  { terms: ["shoe", "shoes", "sneaker", "sneakers", "heels", "sandals"], label: "footwear", category: "Footwear" },
  { terms: ["dress", "shirt", "jeans", "kurta", "tshirt", "jacket"], label: "fashion product", category: "Fashion" },
  { terms: ["bag", "backpack", "purse", "wallet"], label: "bag", category: "Bag" },
  { terms: ["serum", "moisturizer", "lipstick", "makeup", "cleanser"], label: "beauty product", category: "Beauty" },
  { terms: ["protein", "supplement", "vitamin"], label: "wellness product", category: "Wellness" },
  { terms: ["ring", "necklace", "chain", "bracelet", "earring"], label: "jewellery item", category: "Jewellery" },
  { terms: ["fruit", "vegetable", "rice", "snack"], label: "grocery item", category: "Grocery" },
];

const unsupportedServiceTerms = [
  "hotel",
  "flight",
  "ticket",
  "doctor",
  "hospital",
  "plumber",
  "electrician",
  "job",
  "loan",
  "insurance",
  "restaurant",
  "cab",
  "taxi",
];

const supportedCategorySummary =
  "electronics, fashion, beauty, wellness, grocery, footwear, jewellery, and bags";

const tokenize = (text) =>
  normalize(text)
    .split(" ")
    .filter((word) => word.length > 2);

const getProductSearchText = (product) =>
  normalize(
    [
      product.name,
      product.brand,
      product.category,
      product.sourceLabel,
      product.subCategory,
      product.thirdCategory,
      product.thirdLevelCategory,
      product.description,
    ]
      .filter(Boolean)
      .join(" "),
  );

const containsWholeTerm = (text, term) =>
  new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(
    text,
  );

const getProductMatchScore = (product, text) => {
  const tokens = tokenize(text);
  const searchable = getProductSearchText(product);
  const productName = normalize(product.name);
  const productBrand = normalize(product.brand);
  const subCategory = normalize(product.subCategory);
  const thirdCategory = normalize(product.thirdCategory);
  const thirdLevelCategory = normalize(product.thirdLevelCategory);

  let score = 0;
  let lexicalHits = 0;

  tokens.forEach((token) => {
    if (containsWholeTerm(searchable, token)) {
      score += 22;
      lexicalHits += 1;
    } else if (searchable.includes(token)) {
      score += 10;
      lexicalHits += 1;
    }

    if (containsWholeTerm(productName, token)) {
      score += 26;
      lexicalHits += 1;
    } else if (productName.includes(token)) {
      score += 12;
      lexicalHits += 1;
    }

    if (productBrand.includes(token)) {
      score += 10;
      lexicalHits += 1;
    }
    if (subCategory.includes(token)) {
      score += 14;
      lexicalHits += 1;
    }
    if (thirdCategory.includes(token)) {
      score += 12;
      lexicalHits += 1;
    }
    if (thirdLevelCategory.includes(token)) {
      score += 14;
      lexicalHits += 1;
    }
  });

  if (!lexicalHits) {
    return 0;
  }

  score += Number(product.rating || 0) * 5;
  score += Number(product.inStock || 0) > 0 ? 6 : -20;

  return score;
};

const knowledgeReplies = [
  {
    match: ["delivery", "shipping", "when will my order arrive"],
    reply:
      "Orders are usually processed within 24-48 hours, and delivery timing depends on product category, stock readiness, and your location. You can track every order from your order history page.",
  },
  {
    match: ["secure payment", "payment safe", "is payment safe", "cod", "cash on delivery"],
    reply:
      "CLASSYSHOP supports secure checkout handling. You can verify payment method, amount, and delivery details during checkout, and completed orders appear in your order list with payment information.",
  },
  {
    match: ["about classyshop", "about us", "company", "who are you"],
    reply:
      "CLASSYSHOP is a multi-category ecommerce platform for fashion, electronics, grocery, beauty, wellness, footwear, jewellery, and bags, with separate shopping and vendor management flows.",
  },
  {
    match: ["legal", "policy", "rules", "terms", "conditions"],
    reply:
      "CLASSYSHOP expects accurate account details, proper order behavior, and no fraud or spam. Inventory and prices can change with vendor updates, and misuse can lead to account restriction.",
  },
];

const formatProductList = (products = []) =>
  products
    .slice(0, 3)
    .map((item) => item.name)
    .join(", ");

const findIntentCategory = (text) =>
  productIntentMap.find((entry) =>
    entry.terms.some((term) => text.includes(term)),
  )?.category;

const findSpecificProductIntent = (text) =>
  specificProductIntentMap.find((entry) =>
    entry.terms.some((term) => containsWholeTerm(text, term)),
  );

const isProductRelevantToTerms = (product, terms = []) => {
  const searchable = getProductSearchText(product);
  return terms.some((term) => containsWholeTerm(searchable, term));
};

const mapProductsForChat = (products = []) => products.slice(0, 3);

export const getWebsiteAwareChatReply = ({
  message,
  catalog,
  recommendations = [],
}) => {
  const text = normalize(message);

  if (!text) {
    return "Ask about products, delivery, payment, order help, or any CLASSYSHOP policy.";
  }

  const knowledgeMatch = knowledgeReplies.find((item) =>
    item.match.some((term) => text.includes(term)),
  );
  if (knowledgeMatch) {
    return knowledgeMatch.reply;
  }

  const specificIntent = findSpecificProductIntent(text);
  if (specificIntent) {
    const categoryMatches = catalog.filter(
      (product) =>
        normalize(product.sourceLabel || product.category) ===
        normalize(specificIntent.category),
    );

    const focusedMatches = [...categoryMatches]
      .filter((product) =>
        isProductRelevantToTerms(product, specificIntent.terms),
      )
      .map((product) => ({
        ...product,
        matchScore: getProductMatchScore(product, text),
      }))
      .filter((product) => product.matchScore > 12)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);

    return focusedMatches.length
      ? {
          text: `Here are the best ${specificIntent.label} matches I found on Classy Store for your query.`,
          products: mapProductsForChat(focusedMatches),
        }
      : {
          text: `Thank you for your query. I could not find any ${specificIntent.label} products on Classy Store right now. I can still help you with other available ${supportedCategorySummary}.`,
        };
  }

  const intentCategory = findIntentCategory(text);
  if (intentCategory) {
    const categoryMatches = catalog.filter(
      (product) =>
        normalize(product.sourceLabel || product.category) ===
        normalize(intentCategory),
    );

    const sortedMatches = [...categoryMatches]
      .map((product) => ({
        ...product,
        matchScore: getProductMatchScore(product, text),
      }))
      .filter((product) => product.matchScore > 6)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);

    return sortedMatches.length
      ? {
          text: `For ${intentCategory.toLowerCase()} shopping, these matches look best for your query.`,
          products: mapProductsForChat(sortedMatches),
        }
      : {
          text: `Sorry, I could not find any matching ${intentCategory.toLowerCase()} products for your request right now. Please try another keyword, subcategory, or brand.`,
        };
  }

  if (unsupportedServiceTerms.some((term) => containsWholeTerm(text, term))) {
    return {
      text: `Thank you for your query. Currently, Classy Store specializes in products like ${supportedCategorySummary}. We do not offer that service, but I’m here to help with anything available on our platform.`,
    };
  }

  const directMatches = [...catalog]
    .map((product) => ({
      ...product,
      matchScore: getProductMatchScore(product, text),
    }))
    .filter((product) => product.matchScore > 32)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  if (directMatches.length) {
    return {
      text: "I found these products based on your product, brand, or category query.",
      products: mapProductsForChat(directMatches),
    };
  }

  if (text.includes("recommend") || text.includes("suggest")) {
    return recommendations.length
      ? {
          text: "Based on your recent activity, these are strong recommendations for you.",
          products: mapProductsForChat(recommendations),
        }
      : {
          text: "I am still learning your shopping pattern. Browse a few products and I will start recommending better picks.",
        };
  }

  if (text.includes("discount") || text.includes("budget") || text.includes("cheap")) {
    const discounted = [...catalog]
      .sort((a, b) => {
        const discountA =
          Number(a.originalPrice || 0) - Number(a.discountedPrice || 0);
        const discountB =
          Number(b.originalPrice || 0) - Number(b.discountedPrice || 0);
        return discountB - discountA;
      })
      .slice(0, 3);

    return discounted.length
      ? {
          text: "These are the strongest discount-focused picks available right now.",
          products: mapProductsForChat(discounted),
        }
      : {
          text: "I could not find strong discount data right now, but I can still guide you by category.",
        };
  }

  if (text.includes("order") || text.includes("track")) {
    return {
      text: "For order tracking, open your order list from your account. There you can check pending, processing, shipped, out for delivery, delivered, or cancelled status updates.",
    };
  }

  return {
    text: `How can I help you today? You can ask about products, orders, delivery, payment, cart, wishlist, or any issue related to Classy Store. I only suggest items that are actually available on our platform.`,
  };
};
