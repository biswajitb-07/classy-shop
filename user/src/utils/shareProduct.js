const buildDetailParts = (product) =>
  [
    product?.name,
    product?.brand ? `Brand: ${product.brand}` : null,
    product?.category ? `Category: ${product.category}` : null,
    product?.subCategory ? `Subcategory: ${product.subCategory}` : null,
    product?.discountedPrice ? `Price: Rs.${product.discountedPrice}` : null,
    product?.originalPrice ? `MRP: Rs.${product.originalPrice}` : null,
    product?.rating ? `Rating: ${product.rating}` : null,
    Array.isArray(product?.rams) && product.rams.length
      ? `RAM: ${product.rams.join(", ")}`
      : null,
    Array.isArray(product?.storage) && product.storage.length
      ? `Storage: ${product.storage.join(", ")}`
      : null,
  ].filter(Boolean);

export const buildProductShareText = (product, productUrl) => {
  const detailParts = buildDetailParts(product);

  if (product?.description) {
    detailParts.push(product.description.trim());
  }

  if (productUrl) {
    detailParts.push(`Link: ${productUrl}`);
  }

  return detailParts.join("\n");
};

export const shareProduct = async ({ product, productUrl }) => {
  const shareText = buildProductShareText(product, productUrl);

  if (navigator.share) {
    try {
      await navigator.share({
        title: product?.name,
        text: shareText,
        url: productUrl,
      });
      return { mode: "share" };
    } catch (error) {
      if (error?.name === "AbortError") {
        return { mode: "aborted" };
      }
      console.error("Error sharing product:", error);
    }
  }

  await navigator.clipboard.writeText(shareText);
  return { mode: "clipboard" };
};
