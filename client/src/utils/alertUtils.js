import Swal from "sweetalert2";

const base = { confirmButtonColor: "#245C3A", cancelButtonColor: "#6B7280" };

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

export function showDeleteConfirm(itemName) {
  return confirmAction({ title: "Delete " + itemName + "?", text: "This action cannot be undone.", confirmText: "Delete", icon: "warning" });
}

export function showSuccess(title, text) {
  return Swal.fire({ title, text, icon: "success", ...base });
}

export function showError(title, text) {
  return Swal.fire({ title, text, icon: "error", confirmButtonColor: "#DC2626" });
}

export function showWarning(title, text) {
  return Swal.fire({ title, text, icon: "warning", ...base });
}

export function showInfo(title, text) {
  return Swal.fire({ title, text, icon: "info", ...base });
}

export function showLoading(message = "Loading...") {
  Swal.fire({ title: message, allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...base });
}

export function closeAlert() {
  Swal.close();
}

export default { confirmAction, showDeleteConfirm, showSuccess, showError, showWarning, showInfo, showLoading, closeAlert };
