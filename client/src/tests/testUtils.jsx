import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice.js";
import cartReducer from "../features/cart/cartSlice.js";
import wishlistReducer from "../features/wishlist/wishlistSlice.js";
import assistantReducer from "../features/assistant/assistantSlice.js";

export function createStore(preloadedState = {}) {
  return configureStore({
    reducer: { auth: authReducer, cart: cartReducer, wishlist: wishlistReducer, assistant: assistantReducer },
    preloadedState,
  });
}

export function renderWithStore(ui, preloadedState = {}) {
  const store = createStore(preloadedState);
  const utils = render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
  return { ...utils, store };
}
