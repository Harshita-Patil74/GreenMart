import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNotificationIcon, getNotificationStyle, NOTIFICATION_TYPE_ICONS,
  CUSTOMER_CATEGORIES, FARMER_CATEGORIES, ADMIN_CATEGORIES,
} from "./notificationConfig.js";
import { Bell } from "lucide-react";

describe("Notification config", () => {
  it("maps known notification types to lucide icons", () => {
    expect(getNotificationIcon("orderConfirmation")).toBeDefined();
    expect(getNotificationIcon("offerApproved")).toBeDefined();
    expect(getNotificationIcon("offerRejected")).toBeDefined();
    expect(getNotificationIcon("newOrderFarmer")).toBeDefined();
    expect(getNotificationIcon("backInStock")).toBeDefined();
    expect(getNotificationIcon("newMessage")).toBeDefined();
    expect(getNotificationIcon("stockAlert")).toBeDefined();
    expect(getNotificationIcon("farmerVerifiedAdmin")).toBeDefined();
  });

  it("falls back to Bell for unknown types", () => {
    expect(getNotificationIcon("unknownType")).toBe(Bell);
  });

  it("returns style for known types", () => {
    const style = getNotificationStyle("offerApproved");
    expect(style.icon).toBe("text-emerald-600");
    expect(style.background).toBe("bg-emerald-50");
  });

  it("returns default style for unknown types", () => {
    const style = getNotificationStyle("unknownType");
    expect(style.icon).toBe("text-slate-600");
    expect(style.background).toBe("bg-slate-100");
  });

  it("defines customer categories", () => {
    expect(CUSTOMER_CATEGORIES).toContain("all");
    expect(CUSTOMER_CATEGORIES).toContain("orders");
    expect(CUSTOMER_CATEGORIES).toContain("offers");
    expect(CUSTOMER_CATEGORIES).toContain("wishlist");
    expect(CUSTOMER_CATEGORIES).toContain("messages");
    expect(CUSTOMER_CATEGORIES).toContain("support");
    expect(CUSTOMER_CATEGORIES).toContain("account");
  });

  it("defines farmer categories", () => {
    expect(FARMER_CATEGORIES).toContain("all");
    expect(FARMER_CATEGORIES).toContain("orders");
    expect(FARMER_CATEGORIES).toContain("offers");
    expect(FARMER_CATEGORIES).toContain("products");
    expect(FARMER_CATEGORIES).toContain("inventory");
    expect(FARMER_CATEGORIES).toContain("certifications");
  });

  it("defines admin categories", () => {
    expect(ADMIN_CATEGORIES).toContain("all");
    expect(ADMIN_CATEGORIES).toContain("orders");
    expect(ADMIN_CATEGORIES).toContain("farmers");
    expect(ADMIN_CATEGORIES).toContain("products");
    expect(ADMIN_CATEGORIES).toContain("inventory");
    expect(ADMIN_CATEGORIES).toContain("offers");
    expect(ADMIN_CATEGORIES).toContain("support");
    expect(ADMIN_CATEGORIES).toContain("security");
  });

  it("never renders arbitrary component names - icons are predefined", () => {
    const knownTypes = Object.keys(NOTIFICATION_TYPE_ICONS);
    knownTypes.forEach((type) => {
      const Icon = getNotificationIcon(type);
      expect(Icon).toBeTruthy();
    });
  });
});
