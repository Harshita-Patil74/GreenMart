import reducer, { clearCart, fetchCart, optimisticUpdateQuantity } from "./cartSlice.js";

describe("cart pricing state", () => {
  it("keeps server-calculated totals from the cart response", () => {
    const state = reducer(undefined, fetchCart.fulfilled({
      items: [{ product: { _id: "product-a", price: 999 }, quantity: 2 }],
      deliveryCharge: 30,
      totals: { subtotal: 1998, regularDiscount: 199.8, premiumDiscount: 0, discount: 199.8, total: 1828.2, deliveryCharge: 30 },
    }));

    expect(state.totals).toEqual({ subtotal: 1998, regularDiscount: 199.8, premiumDiscount: 0, discount: 199.8, total: 1828.2, deliveryCharge: 30 });
  });

  it("drops stale server totals while an optimistic quantity change awaits repricing", () => {
    const initial = {
      items: [{ product: { _id: "product-a", price: 999 }, quantity: 1, offer: { appliedDiscount: 99.9 } }],
      totals: { subtotal: 999, discount: 99.9, total: 929.1, deliveryCharge: 30 },
    };
    const state = reducer(initial, optimisticUpdateQuantity({ productId: "product-a", quantity: 2 }));

    expect(state.totals).toBeNull();
    expect(state.items[0].offer).toBeNull();
  });

  it("clears all pricing totals when the cart is emptied", () => {
    const state = reducer({
      items: [{ product: { _id: "product-a", price: 999 }, quantity: 1 }],
      totals: { subtotal: 999, discount: 99.9, total: 929.1, deliveryCharge: 30 },
    }, clearCart());

    expect(state.items).toEqual([]);
    expect(state.totals).toEqual({ subtotal: 0, regularDiscount: 0, premiumDiscount: 0, discount: 0, total: 0 });
  });
});
