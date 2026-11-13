import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import cartApi from "../../api/cartApi";
import settingsApi from "../../api/settingsApi";

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

const snapshotItems = (items) => (items || []).map((item) => ({
  ...item,
  offer: item.offer ? { ...item.offer } : item.offer,
}));

const ensurePending = (state) => { if (!state.itemPending) state.itemPending = {}; };
const ensureSeq = (state) => { if (!state.updateSequence) state.updateSequence = {}; };

export const fetchDeliveryCharge = createAsyncThunk("cart/fetchDeliveryCharge", async (_, { rejectWithValue }) => {
  try {
    const { data } = await settingsApi.get();
    const charge = Number(data?.deliveryCharge);
    if (!Number.isFinite(charge) || charge < 0) throw new Error("Delivery charge is unavailable.");
    return charge;
  } catch (error) {
    return rejectWithValue(error);
  }
}, {
  condition: (_, { getState }) => !getState().cart.deliveryLoading,
});

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

export const addItem = createAsyncThunk("cart/addItem", async (product, { getState, rejectWithValue }) => {
  const token = getState().auth?.token;
  if (!token || token === "demo-token") return { product, guest: true };
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
  if (!token || token === "demo-token") return { productId, guest: true };
  try {
    const { data } = await cartApi.remove(productId);
    return { ...unwrapCart(data), guest: false };
  } catch (error) {
    return rejectWithValue(error);
  }
});

const slice = createSlice({
  name: "cart",
  initialState: { items: [], deliveryCharge: null, totals: null, deliveryLoading: false, deliveryError: null, loading: false, itemPending: {}, updateSequence: {}, error: null, loaded: false },
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
    clearItemError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveryCharge.pending, (state) => { state.deliveryLoading = true; state.deliveryError = null; })
      .addCase(fetchDeliveryCharge.fulfilled, (state, action) => { state.deliveryLoading = false; state.deliveryCharge = action.payload; })
      .addCase(fetchDeliveryCharge.rejected, (state, action) => { state.deliveryLoading = false; state.deliveryError = action.payload?.message || "Couldn't load the delivery charge."; })
      .addCase(fetchCart.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCart.fulfilled, (state, action) => {
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
      });
  },
});

export const { setCart, clearCart, optimisticUpdateQuantity, revertCartItems, revertQuantity, clearItemError } = slice.actions;
export default slice.reducer;
