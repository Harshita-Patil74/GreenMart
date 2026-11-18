import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import cartApi from "../../api/cartApi";

const unwrapCart = (data) => ({
  items: Array.isArray(data) ? data : data?.items || [],
  deliveryCharge: data?.deliveryCharge == null ? null : Number(data.deliveryCharge),
  totals: data && ["subtotal", "discount", "total"].every((key) => Number.isFinite(Number(data[key])))
    ? {
      subtotal: Number(data.subtotal),
      regularDiscount: data.regularDiscount == null || !Number.isFinite(Number(data.regularDiscount)) ? null : Number(data.regularDiscount),
      premiumDiscount: data.premiumDiscount == null || !Number.isFinite(Number(data.premiumDiscount)) ? null : Number(data.premiumDiscount),
      discount: Number(data.discount),
      total: Number(data.total),
      deliveryCharge: Number.isFinite(Number(data.deliveryCharge)) ? Number(data.deliveryCharge) : null,
    }
    : null,
});

const itemId = (item) => item.product?._id || item.product?.id || item.product || item.id;

const GUEST_CART_KEY = "greenmart_guest_cart";
const GUEST_SYNC_KEY = "greenmart_guest_sync_key";

const saveGuestCart = (items) => {
  try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items || [])); } catch {}
};

const clearGuestCart = () => {
  try { localStorage.removeItem(GUEST_CART_KEY); } catch {}
};

const loadGuestCartItems = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

export { loadGuestCartItems };

const saveGuestSyncKey = (key) => {  try { localStorage.setItem(GUEST_SYNC_KEY, key); } catch {}
};

const clearGuestSyncKey = () => {
  try { localStorage.removeItem(GUEST_SYNC_KEY); } catch {}
};

const loadGuestSyncKey = () => {
  try {
    const raw = localStorage.getItem(GUEST_SYNC_KEY);
    return raw || null;
  } catch { return null; }
};

const snapshotItems = (items) => (items || []).map((item) => ({
  ...item,
  offer: item.offer ? { ...item.offer } : item.offer,
}));

const ensurePending = (state) => { if (!state.itemPending) state.itemPending = {}; };
const ensureSeq = (state) => { if (!state.updateSequence) state.updateSequence = {}; };

export const fetchCart = createAsyncThunk("cart/fetch", async (_, { rejectWithValue }) => {
  try {
    const { data } = await cartApi.get();
    return unwrapCart(data);
  } catch (error) {
    return rejectWithValue(error);
  }
}, {
  condition: (_, { getState }) => !getState().cart.loading && (!getState().cart.loaded || Boolean(getState().cart.error)),
});

export const fetchDeliveryCharge = createAsyncThunk("cart/fetchDeliveryCharge", async (_, { getState, rejectWithValue }) => {
  try {
    const { data } = await cartApi.get();
    const charge = data?.deliveryCharge == null ? null : Number(data.deliveryCharge);
    if (!Number.isFinite(charge)) return { deliveryCharge: null };
    return { deliveryCharge: charge };
  } catch (error) {
    return rejectWithValue(error);
  }
}, {
  condition: (_, { getState }) => !getState().cart.loading && (!getState().cart.loaded || Boolean(getState().cart.error)),
});

export const syncGuestCart = createAsyncThunk(
  "cart/syncGuestCart",
  async (_, { getState, rejectWithValue, dispatch }) => {
    const state = getState();
    const { user, token } = state.auth;
    if (user?.role !== "customer" || !token || token === "demo-token") {
      return rejectWithValue({ message: "Guest cart sync is only available for customer accounts." });
    }
    if (state.cart.guestCartSynced) {
      return { synced: false, skipped: "already-synced" };
    }
    const guestItems = loadGuestCartItems();
    if (!guestItems.length) {
      return { synced: false, skipped: "empty" };
    }
    let syncKey = state.cart.guestSyncKey || loadGuestSyncKey();
    if (!syncKey) {
      syncKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      saveGuestSyncKey(syncKey);
      dispatch({ type: "cart/setGuestSyncKey", payload: syncKey });
    }
    try {
      const { data } = await cartApi.merge(guestItems, syncKey);
      clearGuestCart();
      clearGuestSyncKey();
      return { synced: true, merged: data, skipped: data.skipped || [] };
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const retryGuestSync = createAsyncThunk(
  "cart/retryGuestSync",
  async (_, { getState, rejectWithValue, dispatch }) => {
    const state = getState();
    const { user, token } = state.auth;
    if (user?.role !== "customer" || !token || token === "demo-token") {
      return rejectWithValue({ message: "Guest cart sync is only available for customer accounts." });
    }
    if (state.cart.guestCartSynced) {
      return { synced: false, skipped: "already-synced" };
    }
    const guestItems = loadGuestCartItems();
    if (!guestItems.length) {
      return { synced: false, skipped: "empty" };
    }
    // Reuse the persisted idempotency key so retries never duplicate quantities.
    let syncKey = state.cart.guestSyncKey || loadGuestSyncKey();
    if (!syncKey) {
      syncKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      saveGuestSyncKey(syncKey);
      dispatch({ type: "cart/setGuestSyncKey", payload: syncKey });
    }
    try {
      const { data } = await cartApi.merge(guestItems, syncKey);
      clearGuestCart();
      clearGuestSyncKey();
      return { synced: true, merged: data, skipped: data.skipped || [] };
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const addItem = createAsyncThunk("cart/addItem", async (product, { getState, rejectWithValue }) => {
  const token = getState().auth?.token;
  if (!token || token === "demo-token") {
    const id = product._id || product.id;
    const existing = getState().cart.items.find((i) => itemId(i) === id);
    const currentQty = existing ? (existing.quantity || 0) : 0;
    const newQty = currentQty + 1;
    const stock = product.stock != null ? Number(product.stock) : null;
    if (stock != null && stock <= 0) return rejectWithValue({ message: "This product is out of stock." });
    if (stock != null && newQty > stock) return rejectWithValue({ message: `Only ${stock} unit${stock > 1 ? "s" : ""} available.` });
    const currentItems = getState().cart.items;
    const updatedItems = existing
      ? currentItems.map((i) => (itemId(i) === id ? { ...i, quantity: newQty } : i))
      : [...currentItems, { product, quantity: 1, price: product.price }];
    saveGuestCart(updatedItems);
    return { product, guest: true };
  }
  try {
    const { data } = await cartApi.add({ productId: product._id || product.id, quantity: 1 });
    return { ...unwrapCart(data), guest: false };
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const updateQuantity = createAsyncThunk("cart/updateQuantity", async ({ productId, quantity }, { getState, dispatch, rejectWithValue }) => {
  const normalizedQuantity = Number(quantity);
  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
    return rejectWithValue({ message: "Quantity must be a whole number of at least 1." });
  }
  const state = getState();
  const token = state.auth?.token;
  const previousItems = snapshotItems(state.cart.items);

  if (!token || token === "demo-token") {
    const item = state.cart.items.find((i) => itemId(i) === productId);
    const stock = item?.product?.stock != null ? Number(item.product.stock) : null;
    if (stock != null && normalizedQuantity > stock) {
      return rejectWithValue({ message: `Only ${stock} unit${stock > 1 ? "s" : ""} available.` });
    }
    const currentItems = state.cart.items;
    const updatedItems = currentItems.map((i) =>
      itemId(i) === productId ? { ...i, quantity: normalizedQuantity } : i
    );
    saveGuestCart(updatedItems);
    dispatch(optimisticUpdateQuantity({ productId, quantity: normalizedQuantity }));
    return { productId, quantity: normalizedQuantity, guest: true };
  }

  const seq = (state.cart.updateSequence?.[productId] || 0) + 1;
  dispatch(optimisticUpdateQuantity({ productId, quantity: normalizedQuantity, seq }));

  try {
    const { data } = await cartApi.update(productId, { quantity: normalizedQuantity });
    const latestSeq = getState().cart.updateSequence?.[productId];
    if (latestSeq !== seq) return { productId, quantity: normalizedQuantity, guest: false, stale: true };
    return { ...unwrapCart(data), guest: false, productId };
  } catch (error) {
    if (getState().cart.updateSequence?.[productId] === seq) {
      dispatch(revertCartItems({ items: previousItems, productId, seq }));
    }
    return rejectWithValue(error);
  }
});

export const removeItem = createAsyncThunk("cart/removeItem", async (productId, { getState, rejectWithValue }) => {
  const token = getState().auth?.token;
  if (!token || token === "demo-token") {
    const currentItems = getState().cart.items;
    const updatedItems = currentItems.filter((item) => itemId(item) !== productId);
    saveGuestCart(updatedItems);
    return { productId, guest: true };
  }
  try {
    const { data } = await cartApi.remove(productId);
    return { ...unwrapCart(data), guest: false };
  } catch (error) {
    return rejectWithValue(error);
  }
});

const slice = createSlice({
  name: "cart",
  initialState: { items: [], deliveryCharge: null, totals: null, loading: false, itemPending: {}, updateSequence: {}, error: null, loaded: false, guestCartSynced: false, guestSyncKey: null, guestSyncStatus: "idle", cartInitialized: false, cartInitRequestId: 0 },
  reducers: {
    setCart: (state, action) => {
      const cart = unwrapCart(action.payload);
      state.items = cart.items;
      if (cart.deliveryCharge !== null) state.deliveryCharge = cart.deliveryCharge;
      state.totals = cart.totals;
      state.loaded = true;
      state.error = null;
    },
    clearCart: (state) => {
      state.items = [];
      state.totals = { subtotal: 0, regularDiscount: 0, premiumDiscount: 0, discount: 0, total: 0 };
      state.error = null;
      state.loaded = true;
    },
    optimisticUpdateQuantity: (state, action) => {
      const { productId, quantity, seq } = action.payload;
      const item = state.items.find((i) => itemId(i) === productId);
      if (item) item.quantity = Number(quantity);
      // Offers depend on quantity and cart subtotal; drop stale discounts until the server re-enriches.
      state.items.forEach((entry) => { entry.offer = null; });
      state.totals = null;
      ensurePending(state);
      if (seq != null) { ensureSeq(state); state.updateSequence[productId] = seq; }
      state.itemPending[productId] = true;
      state.error = null;
    },
    revertCartItems: (state, action) => {
      if (action.payload.seq != null && state.updateSequence?.[action.payload.productId] !== action.payload.seq) return;
      state.items = action.payload.items || [];
      if (state.itemPending && action.payload.productId) delete state.itemPending[action.payload.productId];
    },
    revertQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find((i) => itemId(i) === productId);
      if (item) item.quantity = quantity;
      if (state.itemPending) delete state.itemPending[productId];
    },
    loadGuestCart: (state) => {
      const items = loadGuestCartItems();
      if (items.length) {
        state.items = items;
        state.totals = null;
        state.loaded = true;
        state.error = null;
      }
    },
    mergeGuestCart: (state, action) => {
      const { guestItems } = action.payload;
      for (const guestItem of guestItems || []) {
        const id = itemId(guestItem);
        const stock = guestItem.product?.stock != null ? Number(guestItem.product.stock) : null;
        if (stock != null && stock <= 0) continue;
        const existing = state.items.find((i) => itemId(i) === id);
        if (existing) {
          const combined = (existing.quantity || 0) + (guestItem.quantity || 1);
          existing.quantity = stock != null ? Math.min(combined, stock) : combined;
        } else {
          const qty = stock != null ? Math.min(guestItem.quantity || 1, stock) : (guestItem.quantity || 1);
          state.items.push({ ...guestItem, quantity: qty });
        }
      }
      state.totals = null;
      state.loaded = true;
      state.error = null;
    },
    clearItemError: (state) => { state.error = null; },
    setGuestSyncKey: (state, action) => { state.guestSyncKey = action.payload; },
    setCartInitialized: (state, action) => {
      state.cartInitialized = action.payload.initialized;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.cartInitRequestId = action.meta.requestId;
        state.cartInitialized = true;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        // Ignore stale responses from superseded requests (only when a request
        // has actually been dispatched; initial state has cartInitRequestId === 0).
        if (state.cartInitRequestId !== 0 && action.meta.requestId !== state.cartInitRequestId) return;
        state.loading = false;
        state.loaded = true;
        state.items = action.payload.items;
        if (action.payload.deliveryCharge !== null) state.deliveryCharge = action.payload.deliveryCharge;
        state.totals = action.payload.totals;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = action.payload?.message || "Couldn't load your cart.";
      })
      .addCase(fetchDeliveryCharge.pending, (state) => { state.error = null; })
      .addCase(fetchDeliveryCharge.fulfilled, (state, action) => {
        if (action.payload.deliveryCharge !== null) state.deliveryCharge = action.payload.deliveryCharge;
      })
      .addCase(fetchDeliveryCharge.rejected, (state, action) => {
        state.error = action.payload?.message || "Couldn't fetch delivery charge.";
      })
      .addCase(syncGuestCart.pending, (state) => { state.loading = true; state.error = null; state.guestSyncStatus = "syncing"; state.cartInitialized = true; })
      .addCase(syncGuestCart.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.guestCartSynced = true;
        state.guestSyncStatus = "succeeded";
        state.cartInitialized = true;
        state.cartInitRequestId = action.meta.requestId; // Invalidate any older in-flight fetchCart response
        state.error = null;
        if (action.payload.synced && action.payload.merged) {
          const cart = unwrapCart(action.payload.merged);
          state.items = cart.items;
          if (cart.deliveryCharge !== null) state.deliveryCharge = cart.deliveryCharge;
          state.totals = cart.totals;
        }
      })
      .addCase(syncGuestCart.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.guestCartSynced = false;
        state.guestSyncStatus = "failed";
        state.cartInitialized = true;
        state.error = action.payload?.message || "Guest cart sync failed. Your items are saved locally and will retry on next login.";
      })
      .addCase(retryGuestSync.pending, (state) => { state.loading = true; state.error = null; state.guestSyncStatus = "syncing"; state.cartInitialized = true; })
      .addCase(retryGuestSync.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.guestCartSynced = true;
        state.guestSyncStatus = "succeeded";
        state.cartInitialized = true;
        state.cartInitRequestId = action.meta.requestId; // Invalidate any older in-flight fetchCart response
        state.error = null;
        if (action.payload.synced && action.payload.merged) {
          const cart = unwrapCart(action.payload.merged);
          state.items = cart.items;
          if (cart.deliveryCharge !== null) state.deliveryCharge = cart.deliveryCharge;
          state.totals = cart.totals;
        }
      })
      .addCase(retryGuestSync.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.guestCartSynced = false;
        state.guestSyncStatus = "failed";
        state.cartInitialized = true;
        state.error = action.payload?.message || "Guest cart sync failed. Your items are saved locally and will retry on next login.";
      })
      .addCase(addItem.pending, (state) => { ensurePending(state); state.itemPending.addItem = true; state.error = null; })
      .addCase(addItem.fulfilled, (state, action) => {
        if (state.itemPending) delete state.itemPending.addItem;
        state.loaded = true;
        if (!action.payload.guest) {
          state.items = action.payload.items;
          if (action.payload.deliveryCharge !== null) state.deliveryCharge = action.payload.deliveryCharge;
          state.totals = action.payload.totals;
          return;
        }
        const product = action.payload.product;
        const id = product._id || product.id;
        const existing = state.items.find((item) => itemId(item) === id);
        if (existing) existing.quantity = (existing.quantity || 0) + 1;
        else state.items.push({ product, quantity: 1, price: product.price });
        state.totals = null;
      })
      .addCase(addItem.rejected, (state, action) => { if (state.itemPending) delete state.itemPending.addItem; state.error = action.payload?.message || "Couldn't add this product to your cart."; })
      .addCase(updateQuantity.pending, (state) => { state.error = null; })
      .addCase(updateQuantity.fulfilled, (state, action) => {
        if (action.payload.stale) return;
        state.loaded = true;
        if (!action.payload.guest) {
          if (Array.isArray(action.payload.items)) state.items = action.payload.items;
          if (action.payload.deliveryCharge !== null) state.deliveryCharge = action.payload.deliveryCharge;
          state.totals = action.payload.totals;
        }
        if (state.itemPending) delete state.itemPending[action.payload.productId];
        if (action.payload.guest) {
          // Guest cart persistence is handled in the thunk; keep reducer pure.
        }
      })
      .addCase(updateQuantity.rejected, (state, action) => {
        const quantity = Number(action.meta.arg.quantity);
        if (Number.isInteger(quantity) && quantity >= 1 && state.itemPending) {
          delete state.itemPending[action.meta.arg.productId];
        }
        state.error = action.payload?.message || action.payload?.msg || action.payload?.error || "Couldn't update this quantity.";
      })
      .addCase(removeItem.pending, (state) => { ensurePending(state); state.itemPending.removeItem = true; state.error = null; })
      .addCase(removeItem.fulfilled, (state, action) => {
        if (state.itemPending) delete state.itemPending.removeItem;
        state.loaded = true;
        if (!action.payload.guest) {
          state.items = action.payload.items;
          if (action.payload.deliveryCharge !== null) state.deliveryCharge = action.payload.deliveryCharge;
          state.totals = action.payload.totals;
        } else {
          state.items = state.items.filter((item) => itemId(item) !== action.payload.productId);
          state.totals = null;
        }
      })
      .addCase(removeItem.rejected, (state, action) => { if (state.itemPending) delete state.itemPending.removeItem; state.error = action.payload?.message || action.payload?.msg || action.payload?.error || "Couldn't remove this item."; })
      .addCase("auth/logout", (state) => {
        state.items = [];
        state.totals = null;
        state.error = null;
        state.loaded = false;
        state.guestCartSynced = false;
        state.guestSyncKey = null;
        state.guestSyncStatus = "idle";
        state.cartInitialized = false;
        state.cartInitRequestId = 0;
      });
  },
});

export const { setCart, clearCart, loadGuestCart, mergeGuestCart, optimisticUpdateQuantity, revertCartItems, revertQuantity, clearItemError, setGuestSyncKey, setCartInitialized } = slice.actions;
export default slice.reducer;
