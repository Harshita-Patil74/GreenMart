# GreenMart Navigation Audit

| Route | Page Component | Role | Back Navigation | Next Workflow | Pagination | Missing Work |
|---|---|---|---|---|---|---|
| / | Home | Public | Not applicable | None | No | Primary landing page |
| /product/:id | ProductDetail | Public | BackButton added | Cart/checkout via Add to Cart | No | None |
| /farmers | Farmers | Public | Missing | None | No | BackButton not added |
| /farmers/:id | FarmerProfile | Public | BackButton added | None | No | None |
| /farm-locations | FarmLocations | Public | Missing | None | No | BackButton not added |
| /about | About | Public | Missing | None | No | BackButton not added |
| /contact | Contact | Public | Missing | None | No | BackButton not added |
| /login | Login | Public/Auth | Not applicable | Post-login redirect | No | Primary auth page |
| /admin/login | Login (initialRole admin) | Public/Admin | Not applicable | Post-login redirect | No | Primary auth page |
| /register | Register | Public | Missing | Login after registration | No | BackButton not added |
| /forgot-password | ForgotPassword | Public | Missing | None | No | BackButton not added |
| /reset-password | ResetPassword | Public | Missing | None | No | BackButton not added |
| /reset-password/:token | ResetPassword | Public | Missing | None | No | BackButton not added |
| /shop | Shop | Customer/Public | BackButton added | None | Yes (existing) | Verify pagination/filter preservation |
| /cart | Cart | Customer | BackButton added | Checkout | No | Next button not implemented |
| /checkout | Checkout | Customer | BackButton added | Order Confirmation | No | Next button not implemented |
| /track-order/:id | TrackOrder | Customer | BackButton added | None | No | None |
| /track-order | TrackOrder | Customer | BackButton added | None | No | None |
| /customer/dashboard | CustomerDashboard | Customer | Not applicable (landing) | None | No | Primary dashboard |
| /notifications | Notifications | Customer/Farmer/Admin | BackButton added | None | No | None |
| /order-confirmation/:id | OrderConfirmation | Customer | Missing | None | No | BackButton not added |
| /orders/:id | OrderDetails | Customer/Farmer/Admin | BackButton added | Track Order | No | None |
| /customer/orders | MyOrders | Customer | BackButton added | None | No | Verify pagination/filter preservation |
| /customer/wishlist | Wishlist | Customer | BackButton added | None | No | None |
| /customer/profile | Profile | Customer | BackButton added | None | No | None |
| /customer/addresses | SavedAddresses | Customer | BackButton added | None | No | None |
| /customer/settings | Settings | Customer | Missing | None | No | BackButton not added |
| /farmer/dashboard | FarmerDashboard | Farmer | Not applicable (landing) | None | No | Primary dashboard |
| /farmer/products | MyProducts | Farmer | BackButton added | Add/Edit Product | Yes (existing) | Verify pagination/filter preservation |
| /farmer/products/new | ProductAddEdit | Farmer | BackButton added | My Products after save | No | Next button not implemented |
| /farmer/products/:id/edit | ProductAddEdit | Farmer | BackButton added | My Products after save | No | Next button not implemented |
| /farmer/orders | FarmerOrders | Farmer | BackButton added | None | No | Verify pagination/filter preservation |
| /farmer/inventory | Inventory | Farmer | BackButton added | None | Yes (existing) | Verify pagination/filter preservation |
| /farmer/notifications | FarmerNotifications | Farmer | Missing | None | No | BackButton not added |
| /farmer/profile | FarmerProfilePage | Farmer | Missing | None | No | BackButton not added |
| /admin/dashboard | AdminDashboard | Admin | Not applicable (landing) | None | No | Primary dashboard |
| /admin/products | AdminProducts | Admin | BackButton added | None | Yes (existing) | Verify pagination/filter preservation |
| /admin/orders | AdminOrders | Admin | BackButton added | None | No | Verify pagination/filter preservation |
| /admin/users | AdminUsers | Admin | BackButton added | None | No | Verify pagination/filter preservation |
| /admin/farmers | AdminFarmers | Admin | BackButton added | None | No | Verify pagination/filter preservation |
| /admin/inventory | AdminInventory | Admin | BackButton added | None | No | Verify pagination/filter preservation |
| /admin/analytics | AdminAnalytics | Admin | BackButton added | None | No | Verify pagination/filter preservation |
| /admin/reports | AdminReports | Admin | BackButton added | None | No | Verify pagination/filter preservation |
| /admin/settings | AdminSettings | Admin | BackButton added | None | No | Verify pagination/filter preservation |

## Summary

- Total routes audited: 41
- Pages already updated with BackButton: 23
- Pages still needing BackButton: Farmers, FarmLocations, About, Contact, Register, ForgotPassword, ResetPassword, OrderConfirmation, Settings, FarmerNotifications, FarmerProfilePage
- Functional Next workflows not yet implemented: Cart → Checkout, Checkout → Order Confirmation, Product save → My Products
- Pagination already exists in Shop, MyProducts, AdminProducts, AdminOrders, AdminUsers, AdminFarmers, Inventory; needs verification of boundary/filter behavior
- No tests added for navigation
- Live browser verification not performed
EOF