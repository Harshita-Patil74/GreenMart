const gmailEmailPattern = /^[a-z0-9]+(?:[._%+-][a-z0-9]+)*@gmail\.com$/;
const demoEmailPattern = /^[a-z0-9]+(?:[._%+-][a-z0-9]+)*@demo\.greenmart\.test$/;
const loginEmailPattern = /^[a-z0-9]+(?:[._%+-][a-z0-9]+)*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

function passwordRequirements(password) {
  return [
    ["at least 8 characters", password.length >= 8],
    ["one lowercase letter", /[a-z]/.test(password)],
    ["one uppercase letter", /[A-Z]/.test(password)],
    ["one number", /\d/.test(password)],
    ["one special character", /[^A-Za-z0-9]/.test(password)],
  ];
}

function passwordValidationMessage(password) {
  const missing = passwordRequirements(password)
    .filter(([, valid]) => !valid)
    .map(([description]) => description);
  return missing.length ? `Password must include ${missing.join(", ")}.` : "";
}

module.exports = {
  gmailEmailPattern,
  demoEmailPattern,
  loginEmailPattern,
  passwordValidationMessage,
};
