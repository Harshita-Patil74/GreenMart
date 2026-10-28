export const DASHBOARD_PATH_BY_ROLE = {
  customer: "/customer/dashboard",
  farmer: "/farmer/dashboard",
  admin: "/admin/dashboard",
};

export const dashboardPathForRole = (role) => DASHBOARD_PATH_BY_ROLE[role] || "/login";

export const isAllowedRole = (userRole, allowedRoles) => allowedRoles.includes(userRole);
