export const tokenStorage = {
  set(token, remember) {
    const s = remember ? localStorage : sessionStorage;
    s.setItem("token", token);
    (remember ? sessionStorage : localStorage).removeItem("token");
  },
  get() { return localStorage.getItem("token") || sessionStorage.getItem("token"); },
  clear() { localStorage.removeItem("token"); sessionStorage.removeItem("token"); },
};
