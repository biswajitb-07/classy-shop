import crypto from "crypto";
import { User } from "../models/user/user.model.js";

export const REFERRAL_SIGNUP_BONUS = 50;
export const REFERRAL_REFERRER_BONUS = 50;

const sanitizeAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(numeric);
};

const createReferralSeed = (name = "", email = "") => {
  const nameSeed = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const emailSeed = String(email || "")
    .split("@")[0]
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 2)
    .padEnd(2, "X");

  return `${nameSeed}${emailSeed}`;
};

export const ensureWalletShape = (user) => {
  if (!user.wallet || typeof user.wallet !== "object") {
    user.wallet = {};
  }

  user.wallet.balance = Number(user.wallet.balance || 0);
  user.wallet.lifetimeCredits = Number(user.wallet.lifetimeCredits || 0);
  user.wallet.lifetimeDebits = Number(user.wallet.lifetimeDebits || 0);
  user.wallet.transactions = Array.isArray(user.wallet.transactions)
    ? user.wallet.transactions
    : [];

  return user.wallet;
};

export const generateUniqueReferralCode = async ({
  name = "",
  email = "",
} = {}) => {
  const baseSeed = createReferralSeed(name, email);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const randomSuffix = crypto
      .randomBytes(2)
      .toString("hex")
      .toUpperCase()
      .slice(0, 4);
    const code = `${baseSeed}${randomSuffix}`;
    const existing = await User.findOne({ "referral.code": code })
      .select("_id")
      .lean();

    if (!existing) {
      return code;
    }
  }

  return crypto.randomBytes(5).toString("hex").toUpperCase();
};

export const ensureReferralCode = async (user) => {
  if (!user) return "";

  if (!user.referral || typeof user.referral !== "object") {
    user.referral = {};
  }

  if (user.referral.code) {
    return user.referral.code;
  }

  const nextCode = await generateUniqueReferralCode({
    name: user.name,
    email: user.email,
  });
  user.referral.code = nextCode;
  return nextCode;
};

export const ensureUserBenefits = async (user) => {
  if (!user) return user;

  ensureWalletShape(user);

  if (!user.referral || typeof user.referral !== "object") {
    user.referral = {};
  }

  user.referral.successfulReferrals = Number(
    user.referral.successfulReferrals || 0
  );
  user.referral.totalEarned = Number(user.referral.totalEarned || 0);
  user.referral.rewards = Array.isArray(user.referral.rewards)
    ? user.referral.rewards
    : [];

  await ensureReferralCode(user);

  return user;
};

export const creditWallet = (user, payload = {}) => {
  const amount = sanitizeAmount(payload.amount);
  if (!user || amount <= 0) return 0;

  const wallet = ensureWalletShape(user);
  wallet.balance = Number(wallet.balance || 0) + amount;
  wallet.lifetimeCredits = Number(wallet.lifetimeCredits || 0) + amount;
  wallet.transactions.unshift({
    type: "credit",
    source: payload.source || "system",
    title: payload.title || "Wallet credit",
    description: payload.description || "",
    amount,
    balanceAfter: wallet.balance,
    orderId: payload.orderId || null,
    createdAt: payload.createdAt || new Date(),
  });

  return amount;
};

export const debitWallet = (user, payload = {}) => {
  const amount = sanitizeAmount(payload.amount);
  if (!user || amount <= 0) return 0;

  const wallet = ensureWalletShape(user);
  if (wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  wallet.balance = Number(wallet.balance || 0) - amount;
  wallet.lifetimeDebits = Number(wallet.lifetimeDebits || 0) + amount;
  wallet.transactions.unshift({
    type: "debit",
    source: payload.source || "system",
    title: payload.title || "Wallet debit",
    description: payload.description || "",
    amount,
    balanceAfter: wallet.balance,
    orderId: payload.orderId || null,
    createdAt: payload.createdAt || new Date(),
  });

  return amount;
};
