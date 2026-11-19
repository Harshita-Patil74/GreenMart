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

describe("order item charged amount regression", () => {
  it("shows full price for an item with no discount snapshot", () => {
    const item = { price: 160, quantity: 1 };
    expect(orderItemGross(item)).toBe(160);
    expect(orderItemDiscount(item)).toBe(0);
    expect(orderItemTotal(item)).toBe(160);
  });

  it("shows full price when finalLineTotal is 0 but no real discount exists", () => {
    const item = {
      price: 160,
      quantity: 1,
      offerSnapshot: { appliedDiscount: 0, premiumDiscount: 0, finalLineTotal: 0 },
    };
    expect(orderItemTotal(item)).toBe(160);
    expect(orderItemDiscount(item)).toBe(0);
  });

  it("shows zero only when a legitimate full discount exists", () => {
    const item = {
      price: 160,
      quantity: 1,
      offerSnapshot: { appliedDiscount: 160, premiumDiscount: 0, finalLineTotal: 0 },
    };
    expect(orderItemTotal(item)).toBe(0);
    expect(orderItemDiscount(item)).toBe(160);
  });

  it("shows discounted charged amount when finalLineTotal is a valid partial discount", () => {
    const item = {
      price: 180,
      quantity: 1,
      offerSnapshot: { appliedDiscount: 34.65, premiumDiscount: 0, finalLineTotal: 145.35 },
    };
    expect(orderItemTotal(item)).toBe(145.35);
    expect(orderItemDiscount(item)).toBe(34.65);
  });

  it("handles quantity greater than one with a discount", () => {
    const item = {
      price: 100,
      quantity: 3,
      offerSnapshot: { appliedDiscount: 30, premiumDiscount: 0, finalLineTotal: 270 },
    };
    expect(orderItemGross(item)).toBe(300);
    expect(orderItemTotal(item)).toBe(270);
    expect(orderItemDiscount(item)).toBe(30);
  });

  it("reconciles item subtotal and order total with mixed discounted and non-discounted items", () => {
    const items = [
      { price: 180, quantity: 1, offerSnapshot: { appliedDiscount: 34.65, premiumDiscount: 0, finalLineTotal: 145.35 } },
      { price: 160, quantity: 1 },
    ];
    const grossSum = items.reduce((s, i) => s + orderItemGross(i), 0);
    const chargedSum = items.reduce((s, i) => s + orderItemTotal(i), 0);
    const discountSum = items.reduce((s, i) => s + orderItemDiscount(i), 0);

    expect(grossSum).toBe(340);
    expect(chargedSum).toBe(305.35);
    expect(discountSum).toBe(34.65);
    expect(chargedSum + discountSum).toBe(grossSum);
  });

  it("applies order-level discount without changing item charged amounts", () => {
    const items = [
      { price: 100, quantity: 1 },
      { price: 200, quantity: 1 },
    ];
    const order = { items, subtotal: 300, discount: 30, deliveryCharge: 0, total: 270 };
    const result = orderTotals(order);
    expect(result.total).toBe(270);
    expect(orderItemTotal(items[0])).toBe(100);
    expect(orderItemTotal(items[1])).toBe(200);
  });

  it("handles multiple discounted products", () => {
    const items = [
      { price: 100, quantity: 1, offerSnapshot: { appliedDiscount: 10, premiumDiscount: 0, finalLineTotal: 90 } },
      { price: 200, quantity: 1, offerSnapshot: { appliedDiscount: 40, premiumDiscount: 0, finalLineTotal: 160 } },
    ];
    expect(orderItemTotal(items[0])).toBe(90);
    expect(orderItemTotal(items[1])).toBe(160);
    expect(orderItemDiscount(items[0])).toBe(10);
    expect(orderItemDiscount(items[1])).toBe(40);
  });

  it("zero discount returns full price even with a snapshot present", () => {
    const item = {
      price: 250,
      quantity: 2,
      offerSnapshot: { appliedDiscount: 0, premiumDiscount: 0, finalLineTotal: 500 },
    };
    expect(orderItemTotal(item)).toBe(500);
    expect(orderItemDiscount(item)).toBe(0);
  });
});
