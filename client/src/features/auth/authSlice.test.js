import authReducer, { login, register, logout, restore } from "./authSlice.js";

const baseState = {
  user: null,
  token: null,
  status: "idle",
  error: null,
  loading: false,
};

const authPayload = {
  token: "abc-token",
  user: { id: "u1", name: "Harshita Patil", email: "harshita@demo.greenmart.test", role: "customer" },
};

describe("authSlice reducer", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should start with idle state and token from storage", () => {
    const state = authReducer(undefined, { type: "@@INIT" });
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("login.pending should set loading and clear error", () => {
    const state = authReducer(baseState, login.pending("r1", { email: "a@b.c", password: "p" }));
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it("login.fulfilled should set user and token", () => {
    const state = authReducer(baseState, login.fulfilled(authPayload, "r1", { email: "a@b.c", password: "p" }));
    expect(state.loading).toBe(false);
    expect(state.user).toEqual(authPayload.user);
    expect(state.token).toBe("abc-token");
  });

  it("login.rejected should set error and clear loading", () => {
    // Simulate what rejectWithValue produces: an action with a payload
    const state = authReducer(baseState, {
      type: login.rejected.type,
      payload: { message: "Invalid credentials" },
    });
    expect(state.loading).toBe(false);
    expect(state.error).toEqual({ message: "Invalid credentials" });
  });

  it("register.fulfilled should set user and token", () => {
    const state = authReducer(baseState, register.fulfilled(authPayload, "r2", { name: "X", email: "a@b.c", password: "p", role: "customer" }));
    expect(state.token).toBe("abc-token");
    expect(state.user.role).toBe("customer");
  });

  it("clears an invalid persisted session when account restoration fails", () => {
    localStorage.setItem("token", "expired-token");
    const state = authReducer(
      { ...baseState, user: authPayload.user, token: "expired-token", loading: true },
      { type: restore.rejected.type, payload: { message: "Unauthorized" } }
    );
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.loading).toBe(false);
    expect(localStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  it("logout should clear user, token and storage", () => {
    const seeded = { ...baseState, user: authPayload.user, token: "abc-token" };
    localStorage.setItem("token", "abc-token");
    const state = authReducer(seeded, logout());
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("token")).toBeNull();
  });
});
