import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { dashboardPathForRole, isAllowedRole } from "../../utils/roleAccess";

export default function ProtectedRoute() {
  const { token, user, loading } = useAuth();
  if (token && loading) return <div role="status" className="p-6 text-sm text-muted">Loading your account…</div>;
  if (!token || !user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RoleRoute({ role, roles, children, requireFarmerApproval = false }) {
  const { user, token, loading } = useAuth();
  if (!user && token && loading) return <div role="status" className="p-6 text-sm text-muted">Loading your account…</div>;
  if (!token || !user) return <Navigate to="/login" replace />;
  const allowedRoles = roles || (role ? [role] : []);
  if (!isAllowedRole(user.role, allowedRoles)) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }
  if (requireFarmerApproval && user.role === "farmer" && user.farmerApproved !== true) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-amber-900">Farmer account awaiting approval</h1>
        <p className="mt-2 text-sm text-amber-800">Admin approval is required before you can access farmer management features.</p>
      </section>
    );
  }
  return children || <Outlet />;
}
