import Swal from "sweetalert2";

const base = { confirmButtonColor: "#07814E", cancelButtonColor: "#6B7280" };

export function confirmAction({ title, text, confirmText = "Yes", cancelText = "Cancel", icon = "warning" }) {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    ...base,
  });
}

export function showSuccess(title, text) {
  return Swal.fire({ title, text, icon: "success", ...base });
}

export function showError(title, text) {
  return Swal.fire({ title, text, icon: "error", ...base });
}

export function showWarning(title, text) {
  return Swal.fire({ title, text, icon: "warning", ...base });
}

export default { confirmAction, showSuccess, showError, showWarning };
