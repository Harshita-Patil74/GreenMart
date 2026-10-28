import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import AppRoutes from "./routes/AppRoutes.jsx";
import { restore, logout } from "./features/auth/authSlice.js";
import { connectSocket, disconnectSocket } from "./socket/socketClient.js";

export default function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);
  useEffect(() => { dispatch(restore()); }, [dispatch]);
  useEffect(() => {
    if (token) connectSocket(dispatch); else disconnectSocket();
    return () => {};
  }, [token, dispatch]);
  return <AppRoutes />;
}
