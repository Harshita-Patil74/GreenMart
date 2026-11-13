import { calculateCartTotals, formatINR, itemLineTotal, money } from "./cartTotals.js";

const tomatoes = (quantity, offer) => ({
  product: { _id: "tomatoes", name: "Organic Tomatoes", price: 40 },
  quantity,
  price: 40,
  ...(offer ? { offer } : {}),
});

const spinach = (quantity) => ({
  product: { _id: "spinach", name: "Spinach", price: 25 },
  quantity,
  price: 25,
});

describe("calculateCartTotals", () => {
  it("calculates one product at quantity 1", () => {
    expect(calculateCartTotals([tomatoes(1)], 30)).toEqual({
      subtotal: 40,
      regularDiscount: 0,
      premiumDiscount: 0,
      discount: 0,
      deliveryCharge: 30,
      total: 70,
      deliveryReady: true,
    });
  });

  it("recalculates when quantity is greater than 1", () => {
    expect(calculateCartTotals([tomatoes(3)], 30).subtotal).toBe(120);
    expect(calculateCartTotals([tomatoes(3)], 30).total).toBe(150);
  });

  it("sums multiple products", () => {
    expect(calculateCartTotals([tomatoes(2), spinach(1)], 30)).toMatchObject({
      subtotal: 105,
      total: 135,
    });
  });

  it("applies a valid discount once with a single delivery charge", () => {
    const totals = calculateCartTotals([
      tomatoes(2, { appliedDiscount: 5, lineTotal: 75 }),
    ], 30);
    expect(totals).toMatchObject({ subtotal: 80, discount: 5, deliveryCharge: 30, total: 105 });
  });

  it("uses the server-calculated line total and exact percentage discount for quantity two", () => {
    const item = {
      product: { price: 999 },
      quantity: 2,
      offer: { appliedDiscount: 199.8, finalUnitPrice: 899.1, lineTotal: 1798.2 },
    };
    expect(itemLineTotal(item)).toBe(1798.2);
    expect(calculateCartTotals([item], 30)).toMatchObject({
      subtotal: 1998,
      discount: 199.8,
      total: 1828.2,
    });
  });

  it("splits server savings into regular and Premium portions", () => {
    const item = {
      product: { price: 80 },
      quantity: 1,
      offer: { appliedDiscount: 21, premiumDiscount: 5, lineTotal: 59 },
    };
    expect(calculateCartTotals([item], 30)).toMatchObject({
      subtotal: 80,
      regularDiscount: 16,
      premiumDiscount: 5,
      discount: 21,
      total: 89,
    });
  });

  it("classifies a Premium-exclusive offer entirely as subscriber savings", () => {
    const item = {
      product: { price: 50 },
      quantity: 1,
      offer: {
        audience: ["premium"],
        appliedDiscount: 28.75,
        premiumDiscount: 3.75,
        lineTotal: 21.25,
      },
    };
    expect(calculateCartTotals([item], 30)).toMatchObject({
      regularDiscount: 0,
      premiumDiscount: 28.75,
      discount: 28.75,
      total: 51.25,
    });
  });

  it("ignores invalid or expired discounts with no appliedDiscount", () => {
    expect(calculateCartTotals([tomatoes(2, { title: "Expired", appliedDiscount: 0 })], 30).discount).toBe(0);
    expect(calculateCartTotals([tomatoes(2)], 30).discount).toBe(0);
  });

  it("handles an empty cart without applying delivery", () => {
    expect(calculateCartTotals([], 30)).toEqual({
      subtotal: 0,
      regularDiscount: 0,
      premiumDiscount: 0,
      discount: 0,
      deliveryCharge: 0,
      total: 0,
      deliveryReady: true,
    });
  });

  it("prevents negative totals and caps discount at the line gross", () => {
    const totals = calculateCartTotals([
      tomatoes(1, { appliedDiscount: 999 }),
    ], 30);
    expect(totals.discount).toBe(40);
    expect(totals.total).toBe(30);
    expect(totals.total).toBeGreaterThanOrEqual(0);
  });

  it("rounds currency consistently", () => {
    expect(money(10.005)).toBe(10.01);
    expect(itemLineTotal(tomatoes(1, { appliedDiscount: 2.555 }))).toBe(37.44);
  });

  it("formats rupee amounts with grouping and two decimal places", () => {
    expect(formatINR(1798.2)).toBe("₹ 1,798.20");
  });

  it("ignores invalid quantities and waits for a valid delivery amount", () => {
    expect(calculateCartTotals([tomatoes(0), tomatoes(-1), tomatoes(1.5)], 30)).toMatchObject({
      subtotal: 0,
      deliveryCharge: 0,
      total: 0,
      deliveryReady: true,
    });
    expect(calculateCartTotals([tomatoes(1)], -1)).toMatchObject({
      subtotal: 40,
      deliveryCharge: 0,
      total: 40,
      deliveryReady: false,
    });
  });
});
