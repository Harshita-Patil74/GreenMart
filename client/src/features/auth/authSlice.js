import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import authApi from "../../api/authApi";
import { tokenStorage } from "../../utils/tokenStorage";

export const login = createAsyncThunk("auth/login", async (creds, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(creds);
    tokenStorage.set(data.token, creds.remember);
    return data;
  } catch (e) {
    return rejectWithValue(e);
  }
});

export const register = createAsyncThunk("auth/register", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await authApi.register(payload);
    tokenStorage.set(data.token, true);
    return data;
  } catch (e) {
    return rejectWithValue(e);
  }
});

export const restore = createAsyncThunk("auth/restore", async (_, { rejectWithValue }) => {
  try {
    const token = tokenStorage.get();
    if (!token) return null;
    const { data } = await authApi.me();
    return { user: data, token };
  } catch (e) {
    return rejectWithValue(e);
  }
});

const slice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: tokenStorage.get(),
    status: "idle",
    error: null,
    loading: Boolean(tokenStorage.get())
  },
  reducers: {
    logout: (s) => {
      s.user = null;
      s.token = null;
      s.status = "idle";
      tokenStorage.clear();
    },
    updateUser: (s, a) => {
      if (s.user) s.user = { ...s.user, ...a.payload };
    },
  },
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(login.fulfilled, (s, a) => { s.loading = false; s.user = a.payload.user; s.token = a.payload.token; })
     .addCase(login.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(register.pending, (s) => { s.loading = true; })
     .addCase(register.fulfilled, (s, a) => { s.loading = false; s.user = a.payload.user; s.token = a.payload.token; })
     .addCase(register.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(restore.pending, (s) => { s.loading = true; })
     .addCase(restore.fulfilled, (s, a) => {
       s.loading = false;
       if (a.payload) { s.user = a.payload.user; s.token = a.payload.token; }
     })
     .addCase(restore.rejected, (s, a) => {
       s.loading = false;
       s.error = a.payload;
       s.user = null;
       s.token = null;
       tokenStorage.clear();
     });
  },
});

export const { logout, updateUser } = slice.actions;
export default slice.reducer;