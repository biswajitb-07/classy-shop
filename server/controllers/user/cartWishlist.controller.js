import { Cart } from "../../models/user/cart.model.js";
import { Wishlist } from "../../models/user/wishlist.model.js";
import Fashion from "../../models/vendor/fashion/fashion.model.js";
import Electronics from "../../models/vendor/electronic/electronic.model.js";

const productModels = {
  Fashion,
  Electronics,
};

const CATEGORY_FIELDS = {
  Fashion: ["size"],
  Electronics: ["ram", "storage"],
};

function buildVariantKey(productType, body, hasVariants) {
  const fields = CATEGORY_FIELDS[productType] || [];
  const kvPairs = [];

  if (!hasVariants) {
    return "";
  }

  for (const f of fields) {
    if (body[f] === undefined || body[f] === null) {
      throw new Error(
        `${f} is required for ${productType} when variants are available`
      );
    }
    kvPairs.push(`${f}:${body[f]}`);
  }

  return kvPairs.sort().join("|");
}

export const addToCart = async (req, res) => {
  try {
    const { productId, productType, quantity = 1, ...rest } = req.body;
    const userId = req.id;

    if (!productId || !productType) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID and type are required" });
    }

    const Model = productModels[productType];
    if (!Model) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product type" });
    }

    const product = await Model.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check if the product has variants
    let hasVariants = false;
    if (productType === "Fashion") {
      hasVariants = product.sizes && product.sizes.length > 0;
    } else if (productType === "Electronics") {
      hasVariants =
        (product.rams && product.rams.length > 0) ||
        (product.storage && product.storage.length > 0);
    }

    let variantKey;
    try {
      variantKey = buildVariantKey(productType, rest, hasVariants);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [
          {
            productId,
            productType,
            variants: [{ variant: variantKey || "default", quantity }],
          },
        ],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) =>
          item.productId.toString() === productId &&
          item.productType === productType
      );

      if (itemIndex > -1) {
        const variantIndex = cart.items[itemIndex].variants.findIndex(
          (v) => v.variant === (variantKey || "default")
        );

        if (variantIndex > -1) {
          cart.items[itemIndex].variants[variantIndex].quantity += quantity;
        } else {
          cart.items[itemIndex].variants.push({
            variant: variantKey || "default",
            quantity,
          });
        }
      } else {
        cart.items.push({
          productId,
          productType,
          variants: [{ variant: variantKey || "default", quantity }],
        });
      }
    }

    await cart.save();
    return res
      .status(200)
      .json({ success: true, message: "Product added to cart", cart });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to add to cart" });
  }
};

export const updateCartQuantity = async (req, res) => {
  try {
    const {
      productId,
      productType,
      quantity,
      variant: inputVariant,
    } = req.body;
    const userId = req.id;

    if (!productId || !productType || quantity < 0) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.productType === productType
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not in cart" });
    }

    const variantIndex = cart.items[itemIndex].variants.findIndex(
      (v) => v.variant === inputVariant
    );

    if (variantIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Variant not found in cart" });
    }

    if (quantity === 0) {
      cart.items[itemIndex].variants.splice(variantIndex, 1);
      if (cart.items[itemIndex].variants.length === 0) {
        cart.items.splice(itemIndex, 1);
      }
    } else {
      cart.items[itemIndex].variants[variantIndex].quantity = quantity;
    }

    await cart.save();
    return res
      .status(200)
      .json({ success: true, message: "Quantity updated", cart });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update quantity" });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId, productType, variant: inputVariant } = req.body;
    const userId = req.id;

    const cart = await Cart.findOne({ userId });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.productType === productType
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not in cart" });
    }

    if (inputVariant) {
      const variantIndex = cart.items[itemIndex].variants.findIndex(
        (v) => v.variant === inputVariant
      );
      if (variantIndex > -1) {
        cart.items[itemIndex].variants.splice(variantIndex, 1);
        if (cart.items[itemIndex].variants.length === 0) {
          cart.items.splice(itemIndex, 1);
        }
      }
    } else {
      // remove entire item (all variants)
      cart.items.splice(itemIndex, 1);
    }

    await cart.save();
    return res
      .status(200)
      .json({ success: true, message: "Product removed from cart", cart });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove from cart" });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.id;
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(200).json({ success: true, cart: [] });

    const detailedItems = await Promise.all(
      cart.items.map(async (item) => {
        const Model = productModels[item.productType];
        if (!Model) return null;

        const product = await Model.findById(item.productId).lean();
        if (!product) return null;

        return {
          productId: item.productId,
          productType: item.productType,
          product,
          variants: item.variants, // Changed from sizes to variants
        };
      })
    );

    return res
      .status(200)
      .json({ success: true, cart: detailedItems.filter(Boolean) });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get cart" });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { productId, productType } = req.body;
    const userId = req.id;

    if (!productId || !productType) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID and type are required" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        items: [{ productId, productType }],
      });
    } else {
      const exists = wishlist.items.some(
        (item) =>
          item.productId.toString() === productId &&
          item.productType === productType
      );

      if (exists) {
        return res
          .status(400)
          .json({ success: false, message: "Product already in wishlist" });
      }

      wishlist.items.push({ productId, productType });
    }

    await wishlist.save();
    return res
      .status(200)
      .json({ success: true, message: "Product added to wishlist", wishlist });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to add to wishlist" });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId, productType } = req.body;
    const userId = req.id;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist)
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found" });

    wishlist.items = wishlist.items.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          item.productType === productType
        )
    );

    await wishlist.save();
    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove from wishlist" });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.id;
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) return res.status(200).json({ success: true, wishlist: [] });

    const detailedItems = await Promise.all(
      wishlist.items.map(async (item) => {
        const Model = productModels[item.productType];
        if (!Model) return null;

        const product = await Model.findById(item.productId).lean();
        if (!product) return null;

        return {
          ...item.toObject(),
          product,
        };
      })
    );

    return res
      .status(200)
      .json({ success: true, wishlist: detailedItems.filter(Boolean) });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get wishlist" });
  }
};
