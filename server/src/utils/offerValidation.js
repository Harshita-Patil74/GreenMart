const { z } = require("zod");

const offerFields = {
  farmer: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(1000),
  product: z.string().regex(/^[a-f\d]{24}$/i),
  type: z.enum(["Seasonal Offer", "Farmer Special", "Limited-Time Deal", "Bundle Offer"]),
  discountType: z.enum(["Percentage", "Fixed Amount"]),
  discountValue: z.coerce.number().positive(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  minimumQuantity: z.coerce.number().int().positive().optional(),
  minimumAmount: z.coerce.number().nonnegative().optional(),
  maximumDiscount: z.union([z.coerce.number().nonnegative(), z.null(), z.literal("")]).optional(),
  bundleConditions: z.string().max(500).optional(),
  isSubscriberExclusive: z.boolean().optional(),
  exclusiveDiscountType: z.enum(["Percentage", "Fixed Amount"]).optional(),
  exclusiveDiscountValue: z.coerce.number().nonnegative().optional(),
};

const createOfferSchema = z.object({
  body: z.object(offerFields),
});

const updateOfferSchema = z.object({
  body: z.object(offerFields).partial().refine((body) => Object.keys(body).length > 0),
});

const rejectOfferSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(1).max(500),
  }),
});

module.exports = { createOfferSchema, updateOfferSchema, rejectOfferSchema };
