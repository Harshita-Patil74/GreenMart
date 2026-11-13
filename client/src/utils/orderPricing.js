import { money } from "./cartTotals.js";

export function orderItemGross(item) {
  const price = Number(item?.price);
  const quantity = Number(item?.quantity);
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) return 0;
  return money(price * quantity);
}

export function orderItemTotal(item) {
  const gross = orderItemGross(item);
  const snapshotTotal = item?.offerSnapshot?.finalLineTotal;
  if (snapshotTotal != null && Number.isFinite(Number(snapshotTotal)) && Number(snapshotTotal) >= 0) {
    return money(Math.min(Number(snapshotTotal), gross));
  }
  const discount = Number(item?.offerSnapshot?.appliedDiscount);
  const safeDiscount = Number.isFinite(discount) ? Math.max(0, Math.min(discount, gross)) : 0;
  return money(Math.max(0, gross - safeDiscount));
}

export function orderItemDiscount(item) {
  return money(Math.max(0, orderItemGross(item) - orderItemTotal(item)));
}

export function orderItemPremiumDiscount(item) {
  const isPremiumExclusive = item?.offerSnapshot?.isPremiumExclusive === true ||
    item?.offerSnapshot?.isSubscriberExclusive === true ||
    item?.offerSnapshot?.audience?.includes("premium") === true;
  if (isPremiumExclusive) return orderItemDiscount(item);
  const premium = Number(item?.offerSnapshot?.premiumDiscount);
  if (!Number.isFinite(premium) || premium <= 0) return 0;
  return money(Math.min(premium, orderItemDiscount(item)));
}

export function hasOrderItemDiscountBreakdown(item) {
  return item?.offerSnapshot?.premiumDiscount != null ||
    item?.offerSnapshot?.isPremiumExclusive === true ||
    item?.offerSnapshot?.isSubscriberExclusive === true ||
    item?.offerSnapshot?.audience?.includes("premium") === true;
}

export function orderItemRegularDiscount(item) {
  return money(Math.max(0, orderItemDiscount(item) - orderItemPremiumDiscount(item)));
}

export function orderTotals(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemSubtotal = money(items.reduce((sum, item) => sum + orderItemGross(item), 0));
  const itemDiscount = money(items.reduce((sum, item) => sum + orderItemDiscount(item), 0));
  const subtotal = order.subtotal == null ? itemSubtotal : money(order.subtotal);
  const discount = order.discount == null ? itemDiscount : money(order.discount);
  const discountedItems = items.filter((item) => orderItemDiscount(item) > 0);
  const hasStoredBreakdown = order.regularDiscount != null && order.premiumDiscount != null;
  const hasItemBreakdown = discountedItems.length > 0 && discountedItems.every(hasOrderItemDiscountBreakdown);
  const breakdownKnown = discount <= 0 || hasStoredBreakdown || hasItemBreakdown;
  const itemPremiumDiscount = money(items.reduce((sum, item) => sum + orderItemPremiumDiscount(item), 0));
  const premiumDiscount = breakdownKnown
    ? order.premiumDiscount == null
      ? money(Math.min(discount, itemPremiumDiscount))
      : money(Math.min(discount, Math.max(0, Number(order.premiumDiscount) || 0)))
    : null;
  const regularDiscount = breakdownKnown
    ? order.regularDiscount == null
      ? money(Math.max(0, discount - premiumDiscount))
      : money(Math.max(0, Math.min(discount - premiumDiscount, Number(order.regularDiscount) || 0)))
    : null;
  const deliveryCharge = order.deliveryCharge == null ? 0 : money(order.deliveryCharge);
  const total = order.total == null
    ? money(Math.max(0, subtotal - discount + deliveryCharge))
    : money(order.total);
  return { subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge, total, breakdownKnown };
}
