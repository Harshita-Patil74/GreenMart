const emailPattern = /^[a-z](?:[a-z0-9]|\.(?=[a-z0-9]))*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const demoEmailPattern = /^[a-z](?:[a-z0-9]|\.(?=[a-z0-9]))*@demo\.greenmart\.test$/;

function passwordRequirements(password) {
  return [
    ["at least 8 characters", password.length >= 8],
    ["one lowercase letter", /[a-z]/.test(password)],
    ["one uppercase letter", /[A-Z]/.test(password)],
    ["one number", /\d/.test(password)],
    ["one special character (@ # $ ! % & *)", /[@#$!%&*]/.test(password)],
    ["no spaces", !/\s/.test(password)],
  ];
}

function passwordValidationMessage(password) {
  const missing = passwordRequirements(password)
    .filter(([, valid]) => !valid)
    .map(([description]) => description);
  return missing.length ? `Password must include ${missing.join(", ")}.` : "";
}

module.exports = {
  emailPattern,
  demoEmailPattern,
  loginEmailPattern: emailPattern,
  passwordValidationMessage,
};
