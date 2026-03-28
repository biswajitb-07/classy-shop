import { NewsletterSubscriber } from "../models/newsletter.model.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const subscribeNewsletter = async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const existingSubscriber = await NewsletterSubscriber.findOne({ email });

    if (existingSubscriber) {
      if (!existingSubscriber.isActive) {
        existingSubscriber.isActive = true;
        existingSubscriber.source = "footer-newsletter";
        await existingSubscriber.save();
      }

      return res.status(200).json({
        success: true,
        message: "This email is already subscribed",
      });
    }

    await NewsletterSubscriber.create({
      email,
      source: "footer-newsletter",
    });

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to subscribe",
    });
  }
};
