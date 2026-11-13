import {
  orderItemDiscount,
  orderItemGross,
  orderItemPremiumDiscount,
  orderItemRegularDiscount,
  orderItemTotal,
  orderTotals,
} from "./orderPricing.js";

describe("order pricing snapshots", () => {
  const discountedItem = {
    price: 999,
    quantity: 2,
    offerSnapshot: {
      originalUnitPrice: 999,
      appliedDiscount: 199.8,
      premiumDiscount: 0,
      finalUnitPrice: 899.1,
      finalLineTotal: 1798.2,
      offerTitle: "10% off",
    },
  };

  it("uses the saved purchase-time discounted line amount instead of the original price", () => {
    expect(orderItemGross(discountedItem)).toBe(1998);
    expect(orderItemDiscount(discountedItem)).toBe(199.8);
    expect(orderItemTotal(discountedItem)).toBe(1798.2);
  });

  it("uses original price for legacy orders without a discount snapshot", () => {
    expect(orderItemDiscount({ price: 500, quantity: 2 })).toBe(0);
    expect(orderItemTotal({ price: 500, quantity: 2 })).toBe(1000);
  });

  it("splits saved line discounts into regular and Premium amounts", () => {
    const premiumItem = {
      price: 80,
      quantity: 1,
      offerSnapshot: { appliedDiscount: 21, premiumDiscount: 5, finalLineTotal: 59 },
    };
    expect(orderItemRegularDiscount(premiumItem)).toBe(16);
    expect(orderItemPremiumDiscount(premiumItem)).toBe(5);
  });

  it("classifies a Premium-exclusive order offer as subscriber savings", () => {
    const premiumExclusiveItem = {
      price: 50,
      quantity: 1,
      offerSnapshot: {
        appliedDiscount: 28.75,
        premiumDiscount: 3.75,
        finalLineTotal: 21.25,
        isSubscriberExclusive: true,
        isPremiumExclusive: true,
      },
    };
    expect(orderItemRegularDiscount(premiumExclusiveItem)).toBe(0);
    expect(orderItemPremiumDiscount(premiumExclusiveItem)).toBe(28.75);
  });

  it("calculates an order summary from saved line pricing and delivery", () => {
    expect(orderTotals({
      items: [discountedItem, { price: 500, quantity: 2 }],
      subtotal: 2998,
      discount: 199.8,
      deliveryCharge: 30,
      total: 2828.2,
    })).toEqual({
      subtotal: 2998,
      regularDiscount: 199.8,
      premiumDiscount: 0,
      discount: 199.8,
      deliveryCharge: 30,
      total: 2828.2,
      breakdownKnown: true,
    });
  });

  it("does not invent a regular-versus-Premium split for legacy orders without breakdown fields", () => {
    const legacyItem = {
      price: 999,
      quantity: 2,
      offerSnapshot: { appliedDiscount: 199.8, finalLineTotal: 1798.2 },
    };
    expect(orderTotals({
      items: [legacyItem],
      subtotal: 1998,
      discount: 199.8,
      deliveryCharge: 30,
      total: 1828.2,
    })).toMatchObject({
      regularDiscount: null,
      premiumDiscount: null,
      discount: 199.8,
      breakdownKnown: false,
    });
  });
});
