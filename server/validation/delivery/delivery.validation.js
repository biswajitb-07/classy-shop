import { z } from "zod";

export const createDeliveryPartnerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  vehicleType: z.enum(["bike", "scooter", "cycle", "van"]).optional(),
});

export const deliveryLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
