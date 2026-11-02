const EMAIL_PATTERN = /^[a-z](?:[a-z0-9]|\.(?=[a-z0-9]))*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const DEMO_EMAIL_PATTERN = /^[a-z](?:[a-z0-9]|\.(?=[a-z0-9]))*@demo\.greenmart\.test$/;
const LOGIN_EMAIL_PATTERN = /^[a-z](?:[a-z0-9]|\.(?=[a-z0-9]))*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

export function normalizeEmail(email) {
  return email.toLowerCase();
}

export function isRegistrationEmailValid(email) {
  return EMAIL_PATTERN.test(email);
}

export function isLoginEmailValid(email) {
  return EMAIL_PATTERN.test(email);
}

export function isLegacyDemoEmail(email) {
  return DEMO_EMAIL_PATTERN.test(email);
}

export function passwordRequirements(password) {
  return [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One lowercase letter", valid: /[a-z]/.test(password) },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number", valid: /\d/.test(password) },
    { label: "One special character (@ # $ ! % & *)", valid: /[@#$!%&*]/.test(password) },
    { label: "No spaces", valid: !/\s/.test(password) },
  ];
}

export function passwordValidationMessage(password) {
  const missing = passwordRequirements(password).filter((requirement) => !requirement.valid);
  return missing.length
    ? `Password must include ${missing.map((requirement) => requirement.label.toLowerCase()).join(", ")}.`
    : "";
}
