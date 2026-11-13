const { calculateOffer, computeCartTotals, getDisplayedOffer, getDisplayedSubscriberOffer, money, roundPercent } = require("../src/services/offerService");

describe("computeCartTotals", () => {
  it("calculates a 10% offer once from the original unit price for quantity two", () => {
    const farmerId = "farmer-1";
    const product = { _id: "product-1", farmer: farmerId, price: 999 };
    const offer = {
      _id: "offer-1",
      product: product._id,
      farmer: farmerId,
      discountType: "Percentage",
      discountValue: 10,
      minimumQuantity: 1,
      minimumAmount: 0,
    };
    const applied = calculateOffer(product, 2, [offer], 1998);

    expect(applied).toMatchObject({
      discount: 199.8,
      finalUnitPrice: 899.1,
      finalLineTotal: 1798.2,
    });
    expect(computeCartTotals([{
      price: 999,
      quantity: 2,
      offerSnapshot: { appliedDiscount: applied.discount, finalLineTotal: applied.finalLineTotal },
    }], 30)).toEqual({
      subtotal: 1998,
      regularDiscount: 199.8,
      premiumDiscount: 0,
      discount: 199.8,
      deliveryCharge: 30,
      total: 1828.2,
    });
  });

  it("separates regular and Premium savings without changing the payable total", () => {
    expect(computeCartTotals([{
      product: { price: 80 },
      quantity: 1,
      offer: { appliedDiscount: 21, premiumDiscount: 5, lineTotal: 59 },
    }], 30)).toEqual({
      subtotal: 80,
      regularDiscount: 16,
      premiumDiscount: 5,
      discount: 21,
      deliveryCharge: 30,
      total: 89,
    });
  });

  it("counts a Premium-exclusive offer only as subscriber savings", () => {
    expect(computeCartTotals([{
      product: { price: 50 },
      quantity: 1,
      offer: {
        isSubscriberExclusive: true,
        appliedDiscount: 28.75,
        premiumDiscount: 3.75,
        lineTotal: 21.25,
      },
    }], 30)).toMatchObject({
      regularDiscount: 0,
      premiumDiscount: 28.75,
      discount: 28.75,
      total: 51.25,
    });
  });

  it("rounds the percentage discount per unit before multiplying quantity", () => {
    const farmerId = "farmer-1";
    const product = { _id: "product-2", farmer: farmerId, price: 10 };
    const offer = {
      product: product._id,
      farmer: farmerId,
      discountType: "Percentage",
      discountValue: 33.33,
      minimumQuantity: 1,
    };

    expect(calculateOffer(product, 3, [offer], 30)).toMatchObject({
      discount: 9.99,
      finalUnitPrice: 6.67,
      finalLineTotal: 20.01,
    });
    expect(calculateOffer(product, 3, [{ ...offer, maximumDiscount: 5 }], 30)).toMatchObject({
      discount: 5,
      finalUnitPrice: 8.33,
      finalLineTotal: 25,
    });
  });

  it("does not apply an offer below its minimum quantity or minimum purchase", () => {
    const farmerId = "farmer-1";
    const product = { _id: "product-1", farmer: farmerId, price: 500 };
    const offer = {
      product: product._id,
      farmer: farmerId,
      discountType: "Percentage",
      discountValue: 10,
      minimumQuantity: 2,
      minimumAmount: 1000,
    };

    expect(calculateOffer(product, 1, [offer], 500)).toBeNull();
    expect(calculateOffer(product, 2, [offer], 999)).toBeNull();
    expect(calculateOffer(product, 2, [offer], 1000).discount).toBe(100);
  });

  it("keeps subscriber-exclusive pricing out of public carts and rounds combined savings conventionally", () => {
    const farmerId = "farmer-1";
    const product = { _id: "green-gram", farmer: farmerId, price: 50 };
    const offer = {
      product: product._id,
      farmer: farmerId,
      discountType: "Percentage",
      discountValue: 50,
      minimumQuantity: 1,
      isSubscriberExclusive: true,
      exclusiveDiscountType: "Fixed Amount",
      exclusiveDiscountValue: 3.75,
    };

    expect(calculateOffer(product, 1, [offer], 50, false)).toBeNull();
    const premiumOffer = calculateOffer(product, 1, [offer], 50, true);
    expect(premiumOffer).toMatchObject({
      publicDiscount: 25,
      publicFinalUnitPrice: 25,
      premiumDiscount: 3.75,
      discount: 28.75,
      finalUnitPrice: 21.25,
      finalLineTotal: 21.25,
    });
    expect(roundPercent((premiumOffer.discount / 50) * 100)).toBe(58);
  });

  it("prepares subscriber offer details without returning a Premium payable price", () => {
    const product = { _id: "green-gram", farmer: "farmer-1", status: "Active", price: 50, stock: 10 };
    const offer = {
      _id: "offer-1",
      product: product._id,
      farmer: product.farmer,
      title: "Green Gram Special",
      type: "Seasonal Offer",
      discountType: "Percentage",
      discountValue: 50,
      minimumQuantity: 2,
      minimumAmount: 100,
      maximumDiscount: 60,
      startDate: new Date("2026-11-03T00:00:00.000Z"),
      endDate: new Date("2026-11-23T00:00:00.000Z"),
      isSubscriberExclusive: true,
      exclusiveDiscountType: "Fixed Amount",
      exclusiveDiscountValue: 5,
    };

    const displayed = getDisplayedSubscriberOffer(product, [offer]);

    expect(displayed).toMatchObject({
      title: "Green Gram Special",
      regularDiscountPercent: 50,
      regularDiscountAmount: 25,
      premiumDiscountAmount: 5,
      totalSavings: 60,
      maximumDiscount: 60,
    });
    expect(displayed).not.toHaveProperty("offerPrice");
    expect(displayed).not.toHaveProperty("finalUnitPrice");
  });

  it("displays the public price with separate Premium savings for public offers", () => {
    const product = { _id: "marigold", farmer: "farmer-1", status: "Active", price: 80, stock: 10 };
    const offer = {
      product: product._id,
      farmer: product.farmer,
      title: "Marigold Special",
      type: "Seasonal Offer",
      discountType: "Percentage",
      discountValue: 20,
      minimumQuantity: 1,
      minimumAmount: 0,
      isSubscriberExclusive: false,
      exclusiveDiscountType: "Fixed Amount",
      exclusiveDiscountValue: 5,
    };

    expect(getDisplayedOffer(product, [offer])).toMatchObject({
      originalPrice: 80,
      offerPrice: 64,
      discountPercent: 20,
      premiumDiscountAmount: 5,
      premiumDiscountPercent: 8,
    });
    expect(getDisplayedOffer(product, [offer])).not.toHaveProperty("exclusivePrice");
  });

  it("uses unit price × quantity for subtotal and applies delivery once", () => {
    expect(computeCartTotals([
      { price: 40, quantity: 1 },
    ], 30)).toEqual({
      subtotal: 40,
      regularDiscount: 0,
      premiumDiscount: 0,
      discount: 0,
      deliveryCharge: 30,
      total: 70,
    });
  });

  it("recalculates for quantity greater than 1 and for multiple products", () => {
    expect(computeCartTotals([{ price: 40, quantity: 3 }], 30).subtotal).toBe(120);
    expect(computeCartTotals([
      { price: 40, quantity: 2 },
      { product: { price: 25 }, quantity: 1 },
    ], 30)).toMatchObject({ subtotal: 105, total: 135 });
  });

  it("applies only valid offer discounts from offer or offerSnapshot", () => {
    expect(computeCartTotals([
      { price: 100, quantity: 3, offerSnapshot: { appliedDiscount: 20 } },
    ], 30)).toEqual({
      subtotal: 300,
      regularDiscount: 20,
      premiumDiscount: 0,
      discount: 20,
      deliveryCharge: 30,
      total: 310,
    });
    expect(computeCartTotals([
      { price: 100, quantity: 1, offer: { appliedDiscount: 0 } },
    ], 30).discount).toBe(0);
  });

  it("does not apply delivery or discount on an empty cart and never goes negative", () => {
    expect(computeCartTotals([], 30)).toEqual({
      subtotal: 0,
      regularDiscount: 0,
      premiumDiscount: 0,
      discount: 0,
      deliveryCharge: 0,
      total: 0,
    });
    const overDiscounted = computeCartTotals([{ price: 10, quantity: 1, offer: { appliedDiscount: 50 } }], 30);
    expect(overDiscounted.discount).toBe(10);
    expect(overDiscounted.total).toBe(30);
    expect(money(10.005)).toBe(10.01);
  });
});
