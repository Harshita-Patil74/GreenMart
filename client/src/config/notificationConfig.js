import {
  ShoppingBag, ShoppingCart, PackageCheck, Truck, CircleCheck, PackageX,
  CreditCard, CircleAlert, Wallet, Tag, BadgeCheck, CircleX, RefreshCw, Ban,
  UserPlus, UserCheck, UserX, FileText, ShieldCheck, FileX, PackagePlus,
  Package, AlertTriangle, Heart, MessageCircle, Star, Headset, MessageSquare,
  ShieldAlert, LockKeyhole, Bell, Users, Boxes, BadgePercent, User,
} from "lucide-react";

// Safe, predefined notification type -> icon component mapping.
// Only these known icons are ever rendered; arbitrary component names from
// the database are never used directly. Falls back to Bell for unknown types.
export const NOTIFICATION_TYPE_ICONS = {
  orderConfirmation: ShoppingBag,
  newOrderFarmer: ShoppingCart,
  newOrderAdmin: ShoppingCart,
  statusUpdate: PackageCheck,
  orderStatusAdmin: Truck,
  newOfferAdmin: Tag,
  offerApproved: BadgeCheck,
  offerRejected: CircleX,
  offerResubmitted: RefreshCw,
  offerDeactivated: Ban,
  offerCreatedByAdmin: Tag,
  offerUpdatedByAdmin: Tag,
  newProductAdmin: PackagePlus,
  productDeletedAdmin: Package,
  productCreatedByAdmin: PackagePlus,
  productUpdatedByAdmin: Package,
  stockAlert: AlertTriangle,
  newReviewAdmin: Star,
  newMessage: MessageCircle,
  newContactAdmin: Headset,
  newFarmerAdmin: UserPlus,
  farmerStatusAdmin: UserCheck,
  farmerVerifiedAdmin: UserCheck,
  farmerRejectedAdmin: UserX,
  customerRegisteredAdmin: UserPlus,
  backInStock: PackageCheck,
  passwordChanged: LockKeyhole,
  accountSecurity: ShieldAlert,
  systemNotification: Bell,
  farmerCertificationVerified: ShieldCheck,
  farmerCertificationRejected: FileX,
  farmerAccountActivated: UserCheck,
  farmerCertificationSubmitted: FileText,
  wishlistOffer: Tag,
  wishlistAdded: Heart,
  wishlistRemoved: Heart,
  profileUpdated: User,
  supportRequestSubmitted: FileText,
  paymentSuccess: CreditCard,
};

const TYPE_COLORS = {
  orderConfirmation: { icon: "text-blue-600", background: "bg-blue-50" },
  newOrderFarmer: { icon: "text-blue-600", background: "bg-blue-50" },
  newOrderAdmin: { icon: "text-blue-600", background: "bg-blue-50" },
  statusUpdate: { icon: "text-blue-600", background: "bg-blue-50" },
  orderStatusAdmin: { icon: "text-blue-600", background: "bg-blue-50" },
  newOfferAdmin: { icon: "text-amber-600", background: "bg-amber-50" },
  offerApproved: { icon: "text-emerald-600", background: "bg-emerald-50" },
  offerRejected: { icon: "text-red-600", background: "bg-red-50" },
  offerResubmitted: { icon: "text-amber-600", background: "bg-amber-50" },
  offerDeactivated: { icon: "text-gray-600", background: "bg-gray-50" },
  offerCreatedByAdmin: { icon: "text-amber-600", background: "bg-amber-50" },
  offerUpdatedByAdmin: { icon: "text-amber-600", background: "bg-amber-50" },
  newProductAdmin: { icon: "text-emerald-600", background: "bg-emerald-50" },
  productDeletedAdmin: { icon: "text-gray-600", background: "bg-gray-50" },
  stockAlert: { icon: "text-amber-600", background: "bg-amber-50" },
  newReviewAdmin: { icon: "text-emerald-600", background: "bg-emerald-50" },
  newMessage: { icon: "text-orange-600", background: "bg-orange-50" },
  newContactAdmin: { icon: "text-blue-600", background: "bg-blue-50" },
  newFarmerAdmin: { icon: "text-emerald-600", background: "bg-emerald-50" },
  farmerStatusAdmin: { icon: "text-emerald-600", background: "bg-emerald-50" },
  farmerVerifiedAdmin: { icon: "text-emerald-600", background: "bg-emerald-50" },
  farmerRejectedAdmin: { icon: "text-red-600", background: "bg-red-50" },
  customerRegisteredAdmin: { icon: "text-emerald-600", background: "bg-emerald-50" },
  backInStock: { icon: "text-emerald-600", background: "bg-emerald-50" },
  passwordChanged: { icon: "text-slate-600", background: "bg-slate-100" },
  accountSecurity: { icon: "text-red-600", background: "bg-red-50" },
  systemNotification: { icon: "text-slate-600", background: "bg-slate-100" },
  farmerCertificationVerified: { icon: "text-emerald-600", background: "bg-emerald-50" },
  farmerCertificationRejected: { icon: "text-red-600", background: "bg-red-50" },
  farmerAccountActivated: { icon: "text-emerald-600", background: "bg-emerald-50" },
  farmerCertificationSubmitted: { icon: "text-amber-600", background: "bg-amber-50" },
  wishlistOffer: { icon: "text-emerald-600", background: "bg-emerald-50" },
};

export function getNotificationIcon(type) {
  const Icon = NOTIFICATION_TYPE_ICONS[type] || Bell;
  return Icon;
}

export function getNotificationStyle(type = "") {
  return TYPE_COLORS[type] || { icon: "text-slate-600", background: "bg-slate-100" };
}

export const CUSTOMER_CATEGORIES = ["all", "orders", "offers", "payments", "wishlist", "messages", "support", "account"];
export const FARMER_CATEGORIES = ["all", "orders", "offers", "products", "inventory", "certifications", "messages", "support", "account"];
export const ADMIN_CATEGORIES = ["all", "orders", "farmers", "products", "inventory", "offers", "support", "security"];

export const CATEGORY_LABELS = {
  all: "All",
  orders: "Orders",
  farmers: "Farmers",
  products: "Products",
  inventory: "Inventory",
  offers: "Offers",
  support: "Support",
  security: "Security",
  reviews: "Reviews",
  payments: "Payments",
  wishlist: "Wishlist",
  messages: "Messages",
  account: "Account",
  certifications: "Certifications",
};

export const CATEGORY_ICONS = {
  orders: Package,
  farmers: Users,
  products: Boxes,
  inventory: AlertTriangle,
  offers: BadgePercent,
  support: FileText,
  security: ShieldAlert,
  reviews: Star,
  payments: CreditCard,
  wishlist: Heart,
  messages: MessageCircle,
  account: User,
};

// Map notification `type` -> standard `category` for legacy records saved
// without a category. `type` is the event; `category` is the filter group.
export const TYPE_TO_CATEGORY = {
  orderConfirmation: "orders",
  newOrderFarmer: "orders",
  newOrderAdmin: "orders",
  statusUpdate: "orders",
  orderStatusAdmin: "orders",
  newOfferAdmin: "offers",
  offerApproved: "offers",
  offerRejected: "offers",
  offerResubmitted: "offers",
  offerDeactivated: "offers",
  offerCreatedByAdmin: "offers",
  offerUpdatedByAdmin: "offers",
  newProductAdmin: "products",
  productDeletedAdmin: "products",
  productCreatedByAdmin: "products",
  productUpdatedByAdmin: "products",
  stockAlert: "inventory",
  backInStock: "inventory",
  newReviewAdmin: "products",
  newMessage: "messages",
  newContactAdmin: "support",
  farmerCertificationVerified: "certifications",
  farmerCertificationRejected: "certifications",
  farmerCertificationSubmitted: "certifications",
  farmerAccountActivated: "account",
  passwordChanged: "account",
  accountSecurity: "account",
  systemNotification: "account",
  wishlistAdded: "wishlist",
  wishlistRemoved: "wishlist",
  profileUpdated: "account",
  supportRequestSubmitted: "support",
  paymentSuccess: "payments",
};

export function normalizeCategory(notification) {
  const category = notification && (notification.category || notification.cat);
  if (category) return String(category);
  const type = notification && notification.type;
  return type && TYPE_TO_CATEGORY[type] ? TYPE_TO_CATEGORY[type] : "";
}
