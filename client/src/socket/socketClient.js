import { io } from "socket.io-client";
import { tokenStorage } from "../utils/tokenStorage";
import { useDispatch, useSelector } from "react-redux";
import { addNotification, setUnread } from "../features/notifications/notificationsSlice.js";
import { fetchNotifications, fetchUnreadCount } from "../features/notifications/notificationsSlice.js";

let socket = null;
const orderStatusListeners = new Set();

export function connectSocket(dispatch) {
  const token = tokenStorage.get();
  if (!token || socket) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { auth: { token } });
  socket.on("notification:new", (n) => {
    dispatch(addNotification(n));
  });
  socket.on("order:created", () => {});
  socket.on("order:statusUpdated", (order) => {
    orderStatusListeners.forEach((listener) => listener(order));
  });
  socket.on("order:locationUpdated", () => {});
  socket.on("stock:low", () => {});
  socket.on("message:new", () => {});
  socket.on("disconnect", () => {});
  socket.on("reconnect", () => {
    if (dispatch) {
      dispatch(fetchNotifications());
      dispatch(fetchUnreadCount());
    }
  });
  return socket;
}

export function disconnectSocket() { if (socket) { socket.disconnect(); socket = null; } }
export function subscribeOrderStatus(listener) {
  orderStatusListeners.add(listener);
  return () => orderStatusListeners.delete(listener);
}
export { socket };
export default { connectSocket, disconnectSocket, subscribeOrderStatus };
