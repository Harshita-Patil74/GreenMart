import reducer, { clearCart, fetchCart, loadGuestCart, mergeGuestCart, optimisticUpdateQuantity, syncGuestCart, retryGuestSync } from "./cartSlice.js";

import cartApi from "../../api/cartApi";

const GUEST_CART_KEY = "greenmart_guest_cart";

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

describe("guest cart persistence", () => {
  const initialState = { items: [], deliveryCharge: null, totals: null, loading: false, itemPending: {}, updateSequence: {}, error: null, loaded: false, guestCartSynced: false, guestSyncKey: null, guestSyncStatus: "idle", cartInitialized: false, cartInitRequestId: 0 };

  it("loadGuestCart populates items from localStorage", () => {
    localStorage.setItem("greenmart_guest_cart", JSON.stringify([{ product: { _id: "p1", name: "Apple", price: 50, stock: 10 }, quantity: 2 }]));
    const state = reducer(initialState, loadGuestCart());
    expect(state.items).toHaveLength(1);
    expect(state.items[0].product._id).toBe("p1");
    expect(state.loaded).toBe(true);
    localStorage.removeItem("greenmart_guest_cart");
  });

  it("loadGuestCart does nothing when localStorage is empty", () => {
    localStorage.removeItem("greenmart_guest_cart");
    const state = reducer(initialState, loadGuestCart());
    expect(state.items).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it("mergeGuestCart combines quantities for matching products", () => {
    const stateWithServer = reducer(initialState, fetchCart.fulfilled({
      items: [{ product: { _id: "p1", name: "Apple", price: 50, stock: 10 }, quantity: 1 }],
      totals: { subtotal: 50, discount: 0, total: 50 },
    }));
    const state = reducer(stateWithServer, mergeGuestCart({ guestItems: [{ product: { _id: "p1", name: "Apple", price: 50, stock: 10 }, quantity: 2 }] }));
    const item = state.items.find((i) => i.product._id === "p1");
    expect(item.quantity).toBe(3);
  });

  it("mergeGuestCart adds new guest items not in server cart", () => {
    const stateWithServer = reducer(initialState, fetchCart.fulfilled({
      items: [{ product: { _id: "p1", name: "Apple", price: 50, stock: 10 }, quantity: 1 }],
      totals: { subtotal: 50, discount: 0, total: 50 },
    }));
    const state = reducer(stateWithServer, mergeGuestCart({ guestItems: [{ product: { _id: "p2", name: "Banana", price: 30, stock: 5 }, quantity: 1 }] }));
    expect(state.items).toHaveLength(2);
    expect(state.items.find((i) => i.product._id === "p2")).toBeDefined();
  });

  it("mergeGuestCart caps combined quantity at stock", () => {
    const stateWithServer = reducer(initialState, fetchCart.fulfilled({
      items: [{ product: { _id: "p1", name: "Apple", price: 50, stock: 3 }, quantity: 1 }],
      totals: { subtotal: 50, discount: 0, total: 50 },
    }));
    const state = reducer(stateWithServer, mergeGuestCart({ guestItems: [{ product: { _id: "p1", name: "Apple", price: 50, stock: 3 }, quantity: 5 }] }));
    const item = state.items.find((i) => i.product._id === "p1");
    expect(item.quantity).toBe(3);
  });

  it("mergeGuestCart skips out-of-stock guest items", () => {
    const stateWithServer = reducer(initialState, fetchCart.fulfilled({
      items: [],
      totals: { subtotal: 0, discount: 0, total: 0 },
    }));
    const state = reducer(stateWithServer, mergeGuestCart({ guestItems: [{ product: { _id: "p1", name: "Apple", price: 50, stock: 0 }, quantity: 1 }] }));
    expect(state.items).toEqual([]);
  });
});

describe("syncGuestCart", () => {
  const syncState = { items: [], deliveryCharge: null, totals: null, loading: false, itemPending: {}, updateSequence: {}, error: null, loaded: false, guestCartSynced: false };
  const customerAuth = { user: { role: "customer" }, token: "real-token" };
  const farmerAuth = { user: { role: "farmer" }, token: "real-token" };
  const adminAuth = { user: { role: "admin" }, token: "real-token" };

  const guestItems = [
    { product: { _id: "p1", name: "Apple", price: 50, stock: 10 }, quantity: 2 },
    { product: { _id: "p2", name: "Banana", price: 30, stock: 5 }, quantity: 1 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    cartApi.merge = vi.fn();
    localStorage.removeItem(GUEST_CART_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(GUEST_CART_KEY);
  });

  it("does not call the API when the guest cart is empty", async () => {
    const getState = () => ({ auth: customerAuth, cart: syncState });
    const result = await syncGuestCart()(vi.fn(), getState, {});
    expect(cartApi.merge).not.toHaveBeenCalled();
    expect(result.meta.requestStatus).toBe("fulfilled");
    expect(result.payload.synced).toBe(false);
  });

  it("skips sync for non-customer roles (farmer)", async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
    const getState = () => ({ auth: farmerAuth, cart: syncState });
    const result = await syncGuestCart()(vi.fn(), getState, {});
    expect(cartApi.merge).not.toHaveBeenCalled();
    expect(result.meta.rejectedWithValue).toBe(true);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBe(JSON.stringify(guestItems));
  });

  it("skips sync for non-customer roles (admin)", async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
    const getState = () => ({ auth: adminAuth, cart: syncState });
    const result = await syncGuestCart()(vi.fn(), getState, {});
    expect(cartApi.merge).not.toHaveBeenCalled();
    expect(result.meta.rejectedWithValue).toBe(true);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBe(JSON.stringify(guestItems));
  });

  it("skips sync when already synced (guestCartSynced flag)", async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
    const getState = () => ({ auth: customerAuth, cart: { ...syncState, guestCartSynced: true } });
    const result = await syncGuestCart()(vi.fn(), getState, {});
    expect(cartApi.merge).not.toHaveBeenCalled();
    expect(result.meta.requestStatus).toBe("fulfilled");
    expect(result.payload.synced).toBe(false);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBe(JSON.stringify(guestItems));
  });

  it("merges guest cart to backend and clears localStorage on success", async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
    cartApi.merge.mockResolvedValue({ data: { items: [], subtotal: 0, discount: 0, total: 0, deliveryCharge: 0, skipped: [] } });
    const dispatch = vi.fn();
    const getState = () => ({ auth: customerAuth, cart: syncState });
    const result = await syncGuestCart()(dispatch, getState, {});
    expect(cartApi.merge).toHaveBeenCalledWith(guestItems, expect.any(String));
    expect(result.meta.requestStatus).toBe("fulfilled");
    expect(result.payload.synced).toBe(true);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull();
    expect(localStorage.getItem("greenmart_guest_sync_key")).toBeNull();
  });

  it("preserves guest cart and sync key in localStorage when the API fails", async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
    localStorage.setItem("greenmart_guest_sync_key", "test-sync-key-123");
    cartApi.merge.mockRejectedValue(new Error("Network error"));
    const dispatch = vi.fn();
    const getState = () => ({ auth: customerAuth, cart: { ...syncState, guestSyncKey: "test-sync-key-123" } });
    const result = await syncGuestCart()(dispatch, getState, {});
    expect(cartApi.merge).toHaveBeenCalledWith(guestItems, "test-sync-key-123");
    expect(result.meta.rejectedWithValue).toBe(true);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBe(JSON.stringify(guestItems));
    expect(localStorage.getItem("greenmart_guest_sync_key")).toBe("test-sync-key-123");
  });

  it("reuses the same sync key on retry and does not duplicate quantities", async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
    localStorage.setItem("greenmart_guest_sync_key", "retry-sync-key-456");
    cartApi.merge.mockRejectedValue(new Error("Network error"));
    const dispatch = vi.fn();
    const getState = () => ({ auth: customerAuth, cart: { ...syncState, guestSyncKey: "retry-sync-key-456" } });
    await syncGuestCart()(dispatch, getState, {}).catch(() => {});
    await syncGuestCart()(dispatch, getState, {}).catch(() => {});
    expect(cartApi.merge).toHaveBeenCalledTimes(2);
    expect(cartApi.merge).toHaveBeenCalledWith(guestItems, "retry-sync-key-456");
    expect(localStorage.getItem(GUEST_CART_KEY)).toBe(JSON.stringify(guestItems));
    expect(localStorage.getItem("greenmart_guest_sync_key")).toBe("retry-sync-key-456");
  });
});

describe("stale fetchCart response protection", () => {
  const customerAuth = { user: { role: "customer" }, token: "real-token" };
  const baseState = {
    items: [],
    deliveryCharge: null,
    totals: null,
    loading: false,
    itemPending: {},
    updateSequence: {},
    error: null,
    loaded: false,
    guestCartSynced: false,
    guestSyncKey: null,
    guestSyncStatus: "idle",
    cartInitialized: false,
    cartInitRequestId: 0,
  };

  it("syncGuestCart.fulfilled updates cartInitRequestId to invalidate older fetch responses", () => {
    // Simulate a fetchCart request that was in flight before sync completed
    const stateWithFetchPending = reducer(baseState, {
      type: "cart/fetch/pending",
      meta: { requestId: "fetch-request-1" },
    });
    expect(stateWithFetchPending.cartInitRequestId).toBe("fetch-request-1");

    // Sync completes and updates cartInitRequestId to sync's request ID
    const syncedState = reducer(stateWithFetchPending, syncGuestCart.fulfilled({
      synced: true,
      merged: { items: [{ product: { _id: "p1", price: 50 }, quantity: 2 }], totals: { subtotal: 100, discount: 0, total: 100, deliveryCharge: 30 } },
      skipped: [],
    }, "sync-request-1", { arg: {} }));
    expect(syncedState.cartInitRequestId).toBe("sync-request-1");
    expect(syncedState.items).toHaveLength(1);
    expect(syncedState.items[0].quantity).toBe(2);
  });

  it("older fetchCart.fulfilled response is ignored after sync (stale response protection)", () => {
    // Set up state as if fetchCart was in flight with request ID "fetch-request-1"
    const stateWithFetchPending = reducer(baseState, {
      type: "cart/fetch/pending",
      meta: { requestId: "fetch-request-1" },
    });

    // Sync completes first
    const syncedState = reducer(stateWithFetchPending, syncGuestCart.fulfilled({
      synced: true,
      merged: { items: [{ product: { _id: "p1", price: 50 }, quantity: 2 }], totals: { subtotal: 100, discount: 0, total: 100, deliveryCharge: 30 } },
      skipped: [],
    }, "sync-request-1", { arg: {} }));
    expect(syncedState.cartInitRequestId).toBe("sync-request-1");

    // Older fetch response arrives with its original request ID
    const staleState = reducer(syncedState, fetchCart.fulfilled({
      items: [{ product: { _id: "p2", price: 30 }, quantity: 5 }],
      totals: { subtotal: 150, discount: 0, total: 150, deliveryCharge: 30 },
    }, "fetch-request-1", { arg: {} }));
    // Stale response should be ignored - cartInitRequestId doesn't match
    expect(staleState.items).toHaveLength(1);
    expect(staleState.items[0].product._id).toBe("p1");
    expect(staleState.items[0].quantity).toBe(2);
  });

  it("newer fetchCart.fulfilled response is accepted after sync", () => {
    // Set up state as if sync completed
    const syncedState = reducer(baseState, syncGuestCart.fulfilled({
      synced: true,
      merged: { items: [{ product: { _id: "p1", price: 50 }, quantity: 2 }], totals: { subtotal: 100, discount: 0, total: 100, deliveryCharge: 30 } },
      skipped: [],
    }, "sync-request-1", { arg: {} }));
    expect(syncedState.cartInitRequestId).toBe("sync-request-1");

    // A NEW fetchCart request starts and completes (newer request ID)
    const fetchPending = reducer(syncedState, {
      type: "cart/fetch/pending",
      meta: { requestId: "fetch-request-2" },
    });
    expect(fetchPending.cartInitRequestId).toBe("fetch-request-2");

    const freshState = reducer(fetchPending, fetchCart.fulfilled({
      items: [{ product: { _id: "p2", price: 30 }, quantity: 5 }],
      totals: { subtotal: 150, discount: 0, total: 150, deliveryCharge: 30 },
    }, "fetch-request-2", { arg: {} }));
    expect(freshState.items).toHaveLength(1);
    expect(freshState.items[0].product._id).toBe("p2");
    expect(freshState.items[0].quantity).toBe(5);
  });
});

describe("retryGuestSync", () => {
  const customerAuth = { user: { role: "customer" }, token: "real-token" };
  const syncState = { items: [], deliveryCharge: null, totals: null, loading: false, itemPending: {}, updateSequence: {}, error: null, loaded: false, guestCartSynced: false, guestSyncKey: null, guestSyncStatus: "idle", cartInitialized: false, cartInitRequestId: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    cartApi.merge = vi.fn();
    localStorage.removeItem(GUEST_CART_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem("greenmart_guest_sync_key");
  });

  it("retryGuestSync reuses persisted idempotency key and does not duplicate quantities", async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ product: { _id: "p1", price: 50, stock: 10 }, quantity: 2 }]));
    localStorage.setItem("greenmart_guest_sync_key", "retry-key-789");
    cartApi.merge.mockResolvedValue({ data: { items: [{ product: { _id: "p1", price: 50 }, quantity: 2 }], totals: { subtotal: 100, discount: 0, total: 100, deliveryCharge: 0 }, skipped: [] } });
    const dispatch = vi.fn();
    const getState = () => ({ auth: customerAuth, cart: { ...syncState, guestSyncKey: "retry-key-789" } });
    const result = await retryGuestSync()(dispatch, getState, {});
    expect(cartApi.merge).toHaveBeenCalledWith([{ product: { _id: "p1", price: 50, stock: 10 }, quantity: 2 }], "retry-key-789");
    expect(result.meta.requestStatus).toBe("fulfilled");
    expect(result.payload.synced).toBe(true);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull();
    expect(localStorage.getItem("greenmart_guest_sync_key")).toBeNull();
  });

  it("retryGuestSync preserves guest cart in localStorage on failure", async () => {
    const guestItems = [{ product: { _id: "p1", price: 50, stock: 10 }, quantity: 2 }];
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
    localStorage.setItem("greenmart_guest_sync_key", "retry-fail-key");
    cartApi.merge.mockRejectedValue(new Error("Network error"));
    const dispatch = vi.fn();
    const getState = () => ({ auth: customerAuth, cart: { ...syncState, guestSyncKey: "retry-fail-key" } });
    const result = await retryGuestSync()(dispatch, getState, {});
    expect(result.meta.rejectedWithValue).toBe(true);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBe(JSON.stringify(guestItems));
    expect(localStorage.getItem("greenmart_guest_sync_key")).toBe("retry-fail-key");
  });
});
