import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AppRoutes from "./routes/AppRoutes.jsx";
import { restore } from "./features/auth/authSlice.js";
import { loadGuestCart, syncGuestCart, retryGuestSync, setCartInitialized, fetchCart } from "./features/cart/cartSlice.js";
import { connectSocket, disconnectSocket } from "./socket/socketClient.js";
import { showSuccess, showError } from "./utils/alertUtils.js";

export default function App() {
  const dispatch = useDispatch();
  const { token, user, loading: authLoading } = useSelector((s) => s.auth);
  const guestSyncStatus = useSelector((s) => s.cart.guestSyncStatus);
  const cartInitialized = useSelector((s) => s.cart.cartInitialized);
  const cartLoaded = useSelector((s) => s.cart.loaded);
  const initRef = useRef(false);
  const [initError, setInitError] = useState(null);

  // Restore authentication from persistent storage.
  useEffect(() => {
    dispatch(restore());
  }, [dispatch]);

  // Load guest cart items into Redux so they are visible before sync.
  useEffect(() => {
    dispatch(loadGuestCart());
  }, [dispatch]);

  // Coordinated cart initialization: auth restore → guest sync → fetch cart.
  // Only App.jsx performs cart initialization to prevent competing components.
  useEffect(() => {
    // Reset initialization guard on logout so a subsequent login can re-initialize.
    if (!token || token === "demo-token") {
      initRef.current = false;
      dispatch(setCartInitialized({ initialized: false }));
      return;
    }
    if (initRef.current) return;
    if (authLoading) return;
    const isCustomer = user?.role === "customer";

    async function initializeCart() {
      initRef.current = true;
      try {
        if (isCustomer) {
          const guestItems = JSON.parse(localStorage.getItem("greenmart_guest_cart") || "[]");
          if (Array.isArray(guestItems) && guestItems.length) {
            // Sync guest cart first, then fetch the canonical cart.
            await dispatch(syncGuestCart()).unwrap();
            dispatch(setCartInitialized({ initialized: true }));
            showSuccess("Cart synced", "Your guest cart has been merged with your saved cart.");
          } else {
            // No guest items: fetch the customer's database cart.
            await dispatch(fetchCart()).unwrap();
            dispatch(setCartInitialized({ initialized: true }));
          }
        } else {
          // Farmer/admin: no guest merge, just fetch their cart.
          await dispatch(fetchCart()).unwrap();
          dispatch(setCartInitialized({ initialized: true }));
        }
      } catch (err) {
        setInitError(err?.message || "Cart initialization failed.");
        // Do not mark cart as initialized on failure; allow retry via logout/login or Cart retry button.
        dispatch(setCartInitialized({ initialized: false }));
        if (isCustomer) {
          showError("Sync failed", "Your guest cart was saved locally and will retry on next login.");
        }
      }
    }

    initializeCart();
  }, [dispatch, authLoading, token, user?.role, guestSyncStatus]);

  // Socket connection follows authentication state.
  useEffect(() => {
    if (token) connectSocket(dispatch); else disconnectSocket();
    return () => {};
  }, [token, dispatch]);

  return <AppRoutes />;
}
