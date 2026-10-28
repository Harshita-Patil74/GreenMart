import { useSelector, useDispatch } from "react-redux";
export default function useAuth() {
  const auth = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  return { ...auth, dispatch };
}
