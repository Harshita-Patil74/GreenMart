import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";

const mockHandlers = {};
const mockSocket = {
  on: vi.fn((event, handler) => {
    mockHandlers[event] = handler;
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

let socketClient;

beforeEach(async () => {
  mockSocket.on.mockClear();
  mockSocket.emit.mockClear();
  mockSocket.disconnect.mockClear();
  Object.keys(mockHandlers).forEach((k) => delete mockHandlers[k]);
  localStorage.setItem("token", "test-token");
  vi.resetModules();
  socketClient = await import("./socketClient.js");
});

afterEach(() => {
  localStorage.removeItem("token");
  vi.restoreAllMocks();
});

describe("socketClient order:locationUpdated", () => {
  it("registers order:locationUpdated handler on connect", () => {
    socketClient.connectSocket({ dispatch: vi.fn() });
    expect(mockHandlers["order:locationUpdated"]).toBeDefined();
  });

  it("calls listener with valid location update for matching order", () => {
    socketClient.connectSocket({ dispatch: vi.fn() });
    const listener = vi.fn();
    const unsubscribe = socketClient.subscribeOrderLocation(listener);
    const updatedAt = new Date().toISOString();
    mockHandlers["order:locationUpdated"]({
      _id: "ord-1",
      currentLocation: { lat: 12.97, lng: 77.59, updatedAt },
    });
    expect(listener).toHaveBeenCalledWith({
      orderId: "ord-1",
      location: { lat: 12.97, lng: 77.59 },
      updatedAt,
    });
    unsubscribe();
  });

  it("ignores updates with missing order id", () => {
    socketClient.connectSocket({ dispatch: vi.fn() });
    const listener = vi.fn();
    socketClient.subscribeOrderLocation(listener);
    mockHandlers["order:locationUpdated"]({
      currentLocation: { lat: 12.97, lng: 77.59 },
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores updates with invalid coordinates", () => {
    socketClient.connectSocket({ dispatch: vi.fn() });
    const listener = vi.fn();
    socketClient.subscribeOrderLocation(listener);
    mockHandlers["order:locationUpdated"]({
      _id: "ord-1",
      currentLocation: { lat: "invalid", lng: 77.59 },
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores updates with missing coordinates", () => {
    socketClient.connectSocket({ dispatch: vi.fn() });
    const listener = vi.fn();
    socketClient.subscribeOrderLocation(listener);
    mockHandlers["order:locationUpdated"]({
      _id: "ord-1",
      currentLocation: null,
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it("removes listener on unsubscribe", () => {
    socketClient.connectSocket({ dispatch: vi.fn() });
    const listener = vi.fn();
    const unsubscribe = socketClient.subscribeOrderLocation(listener);
    unsubscribe();
    mockHandlers["order:locationUpdated"]({
      _id: "ord-1",
      currentLocation: { lat: 12.97, lng: 77.59 },
    });
    expect(listener).not.toHaveBeenCalled();
  });
});
