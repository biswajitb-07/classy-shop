const CATEGORY_CONFIG = {
  electronics: {
    endpoint: "/api/v1/vendor/electronic/all-electronic-items",
    listKey: "electronicItems",
  },
  fashion: {
    endpoint: "/api/v1/vendor/fashion/all-fashion-items",
    listKey: "fashionItems",
  },
  footwear: {
    endpoint: "/api/v1/vendor/footwear/all-footwear-items",
    listKey: "footwearItems",
  },
  wellness: {
    endpoint: "/api/v1/vendor/wellness/all-wellness-items",
    listKey: "wellnessItems",
  },
  beauty: {
    endpoint: "/api/v1/vendor/beauty/all-beauty-items",
    listKey: "beautyItems",
  },
  jewellery: {
    endpoint: "/api/v1/vendor/jewellery/all-jewellery-items",
    listKey: "jewelleryItems",
  },
  bag: {
    endpoint: "/api/v1/vendor/bag/all-bag-items",
    listKey: "bagItems",
  },
  bags: {
    endpoint: "/api/v1/vendor/bag/all-bag-items",
    listKey: "bagItems",
  },
  grocery: {
    endpoint: "/api/v1/vendor/grocery/all-grocery-items",
    listKey: "groceryItems",
  },
  groceries: {
    endpoint: "/api/v1/vendor/grocery/all-grocery-items",
    listKey: "groceryItems",
  },
};

const PRODUCT_PATH_RE =
  /^\/(?<category>electronics|fashion|footwear|wellness|beauty|jewellery|bag|bags|grocery|groceries)\/(?<detail>[a-z-]+-product-details)\/(?<productId>[^/?#]+)$/i;

const SITE_NAME = "Classy Shop";
const DEFAULT_TITLE = "Classy Shop";
const DEFAULT_DESCRIPTION =
  "Discover curated products across electronics, fashion, beauty, bags, groceries, jewellery, footwear, and wellness.";
const DEFAULT_IMAGE = "/logo.jpg";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const truncate = (value = "", limit = 180) => {
  const text = String(value).trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
};

const resolveOrigin = (req) => {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = forwardedHost || req.headers.host || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}`;
};

const resolveImageUrl = (origin, imageUrl) => {
  if (!imageUrl) return `${origin}${DEFAULT_IMAGE}`;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return new URL(imageUrl, origin).toString();
};

const getApiBaseUrl = () =>
  process.env.VITE_API_URL ||
  process.env.API_URL ||
  process.env.BACKEND_URL ||
  "";

const buildProductDescription = (product) => {
  const parts = [
    product?.brand ? `Brand: ${product.brand}` : null,
    product?.discountedPrice ? `Price: Rs.${product.discountedPrice}` : null,
    product?.originalPrice ? `MRP: Rs.${product.originalPrice}` : null,
    product?.rating ? `Rating: ${product.rating}` : null,
    Array.isArray(product?.rams) && product.rams.length
      ? `RAM: ${product.rams.join(", ")}`
      : null,
    Array.isArray(product?.storage) && product.storage.length
      ? `Storage: ${product.storage.join(", ")}`
      : null,
    product?.shippingInfo ? product.shippingInfo : null,
    product?.description ? product.description : null,
  ].filter(Boolean);

  return truncate(parts.join(" | "), 220);
};

const renderHtml = ({
  title,
  description,
  imageUrl,
  pageUrl,
  category,
  brand,
  price,
}) => {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(imageUrl);
  const safeUrl = escapeHtml(pageUrl);
  const safeCategory = escapeHtml(category || "product");
  const safeBrand = escapeHtml(brand || category || "product");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:secure_url" content="${safeImage}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="product:brand" content="${safeBrand}" />
    ${price ? `<meta property="product:price:amount" content="${escapeHtml(price)}" />` : ""}
    ${price ? `<meta property="product:price:currency" content="INR" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />
  </head>
  <body>
    <p>${safeTitle}</p>
    <p>${safeDescription}</p>
    <p><a href="${safeUrl}">Open product</a></p>
  </body>
</html>`;
};

const sendHtml = (res, html) => {
  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
};

const sendFallback = (res, pageUrl) => {
  sendHtml(
    res,
    renderHtml({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      imageUrl: DEFAULT_IMAGE,
      pageUrl,
      category: "Classy Shop",
    }),
  );
};

export default async function handler(req, res) {
  const requestUrl = new URL(req.url, resolveOrigin(req));
  const path = requestUrl.searchParams.get("path") || requestUrl.pathname;
  const match = path.match(PRODUCT_PATH_RE);

  if (!match?.groups) {
    sendFallback(res, `${resolveOrigin(req)}${path}`);
    return;
  }

  const { category, productId, detail } = match.groups;
  const config = CATEGORY_CONFIG[category.toLowerCase()];
  const pageUrl = `${resolveOrigin(req)}${path}`;

  if (!config) {
    sendFallback(res, pageUrl);
    return;
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    sendFallback(res, pageUrl);
    return;
  }

  try {
    const response = await fetch(new URL(config.endpoint, apiBaseUrl), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Preview fetch failed with ${response.status}`);
    }

    const data = await response.json();
    const items = data?.[config.listKey] || [];
    const product = items.find((item) => String(item._id) === productId);

    if (!product) {
      sendFallback(res, pageUrl);
      return;
    }

    const imageUrl = resolveImageUrl(
      resolveOrigin(req),
      product?.image?.[0] || DEFAULT_IMAGE,
    );
    const description = buildProductDescription(product);
    const title = `${product?.name || "Product"} | ${SITE_NAME}`;

    sendHtml(
      res,
      renderHtml({
        title,
        description,
        imageUrl,
        pageUrl,
        category: detail,
        brand: product?.brand,
        price: product?.discountedPrice,
      }),
    );
  } catch (error) {
    console.error("OG preview render failed:", error);
    sendFallback(res, pageUrl);
  }
}
