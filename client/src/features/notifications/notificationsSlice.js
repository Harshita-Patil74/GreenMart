import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import notificationApi from "../../api/notificationApi";

export const fetchNotifications = createAsyncThunk("notifications/fetch", async (_, { rejectWithValue }) => {
  try {
    const { data } = await notificationApi.list();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchUnreadCount = createAsyncThunk("notifications/fetchUnread", async (_, { rejectWithValue }) => {
  try {
    const { data } = await notificationApi.unreadCount();
    return Number(data?.count || 0);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const s = createSlice({
  name: "notifications",
  initialState: { items: [], unread: 0, loading: false, error: null },
  reducers: {
    setNotifications: (st, a) => { st.items = a.payload; st.unread = a.payload.filter((n) => !n.isRead).length; },
    setUnread: (st, a) => { st.unread = a.payload; },
    addNotification: (st, a) => {
      const n = a.payload;
      if (st.items.some((item) => String(item._id) === String(n._id))) return;
      st.items.unshift(n);
      if (!n.isRead) st.unread += 1;
    },
    markRead: (st, a) => {
      const item = st.items.find((i) => String(i._id) === String(a.payload));
      if (item && !item.isRead) { item.isRead = true; st.unread = Math.max(0, st.unread - 1); }
    },
    markAllRead: (st) => { st.items.forEach((i) => { i.isRead = true; }); st.unread = 0; },
    removeNotification: (st, a) => {
      st.items = st.items.filter((i) => String(i._id) !== String(a.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (st) => { st.loading = true; st.error = null; })
      .addCase(fetchNotifications.fulfilled, (st, a) => { st.loading = false; st.items = a.payload; st.unread = a.payload.filter((n) => !n.isRead).length; })
      .addCase(fetchNotifications.rejected, (st, a) => { st.loading = false; st.error = a.payload?.message || "Failed to load notifications."; })
      .addCase(fetchUnreadCount.fulfilled, (st, a) => { st.unread = a.payload; });
  },
});

export const { setNotifications, setUnread, addNotification, markRead, markAllRead, removeNotification } = s.actions;
export default s.reducer;
