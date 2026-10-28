import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice.js";
import productsReducer from "../features/products/productsSlice.js";
import cartReducer from "../features/cart/cartSlice.js";
import ordersReducer from "../features/orders/ordersSlice.js";
import notificationsReducer from "../features/notifications/notificationsSlice.js";
import wishlistReducer from "../features/wishlist/wishlistSlice.js";
import assistantReducer from "../features/assistant/assistantSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    cart: cartReducer,
    orders: ordersReducer,
    notifications: notificationsReducer,
    wishlist: wishlistReducer,
    assistant: assistantReducer,
  },
});
