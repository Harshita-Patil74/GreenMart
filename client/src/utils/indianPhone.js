export function getIndianPhoneDigits(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 14 && digits.startsWith("0091")) return digits.slice(4);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(0, 10);
}

export function isValidIndianPhoneDigits(phone) {
  return /^\d{10}$/.test(phone);
}

export function formatIndianPhoneNumber(phone) {
  return `+91 ${phone}`;
}
