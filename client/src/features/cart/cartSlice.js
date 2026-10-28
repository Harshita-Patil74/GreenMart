import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import cartApi from "../../api/cartApi";
import settingsApi from "../../api/settingsApi";

const unwrapCart = (data) => ({
  items: Array.isArray(data) ? data : data?.items || [],
  deliveryCharge: data?.deliveryCharge == null ? null : Number(data.deliveryCharge),
});

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

export const updateQuantity = createAsyncThunk("cart/updateQuantity", async ({ productId, quantity }, { getState, rejectWithValue }) => {
  const token = getState().auth?.token;
  if (!token || token === "demo-token") return { productId, quantity, guest: true };
  try {
    const { data } = await cartApi.update(productId, { quantity });
    return { ...unwrapCart(data), guest: false };
  } catch (error) {
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
  initialState: { items: [], deliveryCharge: null, deliveryLoading: false, deliveryError: null, loading: false, saving: false, error: null, loaded: false },
  reducers: {
    setCart: (state, action) => {
      const cart = unwrapCart(action.payload);
      state.items = cart.items;
      if (cart.deliveryCharge !== null) state.deliveryCharge = cart.deliveryCharge;
      state.loaded = true;
      state.error = null;
    },
    clearCart: (state) => {
      state.items = [];
      state.error = null;
      state.loaded = true;
    },
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
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = action.payload?.message || "Couldn't load your cart.";
      })
      .addCase(addItem.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(addItem.fulfilled, (state, action) => {
        state.saving = false;
        state.loaded = true;
        if (!action.payload.guest) {
          state.items = action.payload.items;
          if (action.payload.deliveryCharge !== null) state.deliveryCharge = action.payload.deliveryCharge;
          return;
        }
        const product = action.payload.product;
        const id = product._id || product.id;
        const existing = state.items.find((item) => (item.product?._id || item.product?.id || item.product || item.id) === id);
        if (existing) existing.quantity = (existing.quantity || 0) + 1;
        else state.items.push({ product, quantity: 1, price: product.price });
      })
      .addCase(addItem.rejected, (state, action) => { state.saving = false; state.error = action.payload?.message || "Couldn't add this product to your cart."; })
      .addCase(updateQuantity.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(updateQuantity.fulfilled, (state, action) => {
        state.saving = false;
        state.loaded = true;
        if (!action.payload.guest) {
          state.items = action.payload.items;
          if (action.payload.deliveryCharge !== null) state.deliveryCharge = action.payload.deliveryCharge;
          return;
        }
        const { productId, quantity } = action.payload;
        if (quantity <= 0) state.items = state.items.filter((item) => (item.product?._id || item.product?.id || item.product || item.id) !== productId);
        else {
          const item = state.items.find((entry) => (entry.product?._id || entry.product?.id || entry.product || entry.id) === productId);
          if (item) item.quantity = quantity;
        }
      })
      .addCase(updateQuantity.rejected, (state, action) => { state.saving = false; state.error = action.payload?.message || "Couldn't update this quantity."; })
      .addCase(removeItem.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(removeItem.fulfilled, (state, action) => {
        state.saving = false;
        state.loaded = true;
        if (!action.payload.guest) {
          state.items = action.payload.items;
          if (action.payload.deliveryCharge !== null) state.deliveryCharge = action.payload.deliveryCharge;
        } else {
          state.items = state.items.filter((item) => (item.product?._id || item.product?.id || item.product || item.id) !== action.payload.productId);
        }
      })
      .addCase(removeItem.rejected, (state, action) => { state.saving = false; state.error = action.payload?.message || "Couldn't remove this item."; })
      .addCase("auth/logout", (state) => {
        state.items = [];
        state.error = null;
        state.loaded = false;
      });
  },
});

export const { setCart, clearCart } = slice.actions;
export default slice.reducer;
