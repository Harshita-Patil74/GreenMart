import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import wishlistApi from "../../api/wishlistApi";

export const fetchWishlist = createAsyncThunk("wishlist/fetch", async (_, { rejectWithValue }) => {
  try {
    const { data } = await wishlistApi.get();
    return data?.products || data?.items || (Array.isArray(data) ? data : []);
  } catch (e) {
    return rejectWithValue(e);
  }
}, {
  condition: (_, { getState }) => !getState().wishlist.loading && (!getState().wishlist.loaded || Boolean(getState().wishlist.error)),
});

export const toggleWishlist = createAsyncThunk("wishlist/toggle", async (product, { rejectWithValue }) => {
  try {
    await wishlistApi.toggle({ productId: product._id || product.id });
    return product;
  } catch (e) {
    return rejectWithValue(e);
  }
});

const s = createSlice({
  name: "wishlist",
  initialState: { items: [], loading: false, loaded: false, error: null },
  reducers: {
    setWishlist: (state, action) => {
      state.items = action.payload || [];
      state.loaded = true;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchWishlist.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchWishlist.fulfilled, (s, a) => { s.loading = false; s.loaded = true; s.items = a.payload; })
     .addCase(fetchWishlist.rejected, (s, a) => { s.loading = false; s.loaded = true; s.error = a.payload?.message || "Couldn't load your wishlist."; })
     .addCase(toggleWishlist.fulfilled, (s, a) => {
       s.error = null;
       s.loaded = true;
       const id = a.payload._id || a.payload.id;
       const idx = s.items.findIndex((x) => (x._id || x.id || x.product?._id) === id);
       if (idx >= 0) s.items.splice(idx, 1); else s.items.push(a.payload);
     })
     .addCase("auth/logout", (s) => { s.items = []; s.loaded = false; s.error = null; });
  },
});

export const { setWishlist } = s.actions;
export default s.reducer;