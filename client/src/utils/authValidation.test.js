import {
  isLegacyDemoEmail,
  isLoginEmailValid,
  isRegistrationEmailValid,
  normalizeEmail,
  passwordRequirements,
  passwordValidationMessage,
} from "./authValidation.js";

describe("authentication input validation", () => {
  it("normalizes email casing for storage and accepts valid domains", () => {
    expect(normalizeEmail("user123@gmail.com")).toBe("user123@gmail.com");
    expect(normalizeEmail("USER123@gmail.com")).toBe("user123@gmail.com");
    expect(isRegistrationEmailValid("user123@gmail.com")).toBe(true);
    expect(isRegistrationEmailValid("user123@outlook.com")).toBe(true);
  });

  it.each([
    ".roy@gmail.com",
    "roy.@gmail.com",
    "roy..sharma@gmail.com",
    "roy@gmail",
    "roy sharma@gmail.com",
    "Roy@gmail.com",
    "1roy@gmail.com",
    "roy+sharma@gmail.com",
    "roy@ gmail.com",
    " roy@gmail.com",
    "roy@gmail.com ",
    "user@gmail.COM",
  ])(
    "rejects invalid registration email %s",
    (email) => expect(isRegistrationEmailValid(email)).toBe(false)
  );

  it("allows valid lowercase email addresses for login and registration", () => {
    expect(isLoginEmailValid("harshita@demo.greenmart.test")).toBe(true);
    expect(isLegacyDemoEmail("harshita@demo.greenmart.test")).toBe(true);
    expect(isLoginEmailValid("admin@greenmart.com")).toBe(true);
    expect(isLoginEmailValid("roysharma2026@gmail.com")).toBe(true);
    expect(isLoginEmailValid("not-an-email")).toBe(false);
    expect(isLoginEmailValid("Admin@greenmart.com")).toBe(false);
    expect(isLoginEmailValid(".roy@gmail.com")).toBe(false);
    expect(isLoginEmailValid("roy..sharma@gmail.com")).toBe(false);
    expect(isLoginEmailValid("roy@gmail")).toBe(false);
    expect(isLoginEmailValid("roy sharma@gmail.com")).toBe(false);
    expect(isRegistrationEmailValid("admin@greenmart.com")).toBe(true);
  });

  it("reports each missing password requirement", () => {
    expect(passwordRequirements("weak")).toHaveLength(6);
    expect(passwordValidationMessage("weak")).toContain("at least 8 characters");
    expect(passwordValidationMessage("ValidPass1!")).toBe("");
    expect(passwordValidationMessage("ValidPass1-")).toContain("special character");
    expect(passwordValidationMessage("Valid Pass1!")).toContain("no spaces");
  });
});
