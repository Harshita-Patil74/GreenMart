export function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatINR(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `₹ ${money(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function itemUnitPrice(item) {
  return Number(item?.product?.price ?? item?.price ?? 0);
}

export function itemQuantity(item) {
  const quantity = Number(item?.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) return 0;
  return quantity;
}

export function itemLineGross(item) {
  const price = itemUnitPrice(item);
  const quantity = itemQuantity(item);
  if (!Number.isFinite(price) || price < 0 || quantity <= 0) return 0;
  return money(price * quantity);
}

export function itemDiscount(item) {
  const gross = itemLineGross(item);
  const serverLineTotalValue = item?.offer?.lineTotal ?? item?.offerSnapshot?.finalLineTotal;
  const serverLineTotal = serverLineTotalValue == null ? NaN : Number(serverLineTotalValue);
  if (Number.isFinite(serverLineTotal) && serverLineTotal >= 0) {
    return money(Math.max(0, gross - Math.min(serverLineTotal, gross)));
  }
  const applied = Number(item?.offer?.appliedDiscount || 0);
  if (!Number.isFinite(applied) || applied <= 0) return 0;
  return money(Math.min(applied, gross));
}

export function itemPremiumDiscount(item, isPremium = false) {
  if (!isPremium) return 0;
  const isPremiumExclusive = item?.offer?.audience
    ? item.offer.audience.length === 1 && item.offer.audience.includes("premium")
    : item?.offer?.isPremiumExclusive === true ||
      item?.offer?.isSubscriberExclusive === true;
  const snapshotAudience = item?.offerSnapshot?.audience;
  const isSnapshotPremiumExclusive = snapshotAudience
    ? snapshotAudience.length === 1 && snapshotAudience.includes("premium")
    : item?.offerSnapshot?.isPremiumExclusive === true ||
      item?.offerSnapshot?.isSubscriberExclusive === true;
  if (isPremiumExclusive || isSnapshotPremiumExclusive) return itemDiscount(item);
  const premium = Number(item?.offer?.premiumDiscount ?? item?.offerSnapshot?.premiumDiscount ?? 0);
  if (!Number.isFinite(premium) || premium <= 0) return 0;
  return money(Math.min(premium, itemDiscount(item)));
}

export function itemRegularDiscount(item, isPremium = false) {
  return money(Math.max(0, itemDiscount(item) - itemPremiumDiscount(item, isPremium)));
}

export function itemLineTotal(item) {
  const gross = itemLineGross(item);
  const serverLineTotalValue = item?.offer?.lineTotal ?? item?.offerSnapshot?.finalLineTotal;
  const serverLineTotal = serverLineTotalValue == null ? NaN : Number(serverLineTotalValue);
  if (Number.isFinite(serverLineTotal) && serverLineTotal >= 0) {
    return money(Math.min(serverLineTotal, gross));
  }
  return money(Math.max(0, gross - itemDiscount(item)));
}

export function calculateCartTotals(items = [], deliveryCharge = null, isPremium = false) {
  const list = Array.isArray(items) ? items : [];
  const subtotal = money(list.reduce((sum, item) => sum + itemLineGross(item), 0));
  const discount = money(Math.min(subtotal, list.reduce((sum, item) => sum + itemDiscount(item), 0)));
  const premiumDiscount = money(Math.min(discount, list.reduce((sum, item) => sum + itemPremiumDiscount(item, isPremium), 0)));
  const regularDiscount = money(discount - premiumDiscount);
  const hasItems = subtotal > 0;
  const charge = deliveryCharge == null ? null : Number(deliveryCharge);
  const deliveryReady = charge != null && Number.isFinite(charge) && charge >= 0;
  const delivery = hasItems && deliveryReady ? money(charge) : null;
  const total = money(Math.max(0, subtotal - discount + (delivery || 0)));
  return { subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge: delivery, total, deliveryReady };
}
