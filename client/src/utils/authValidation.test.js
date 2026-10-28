import {
  isLegacyDemoEmail,
  isLoginEmailValid,
  isRegistrationEmailValid,
  normalizeEmail,
  passwordRequirements,
  passwordValidationMessage,
} from "./authValidation.js";

describe("authentication input validation", () => {
  it("trims email whitespace and accepts lowercase Gmail addresses", () => {
    expect(normalizeEmail("  user123@gmail.com  ")).toBe("user123@gmail.com");
    expect(isRegistrationEmailValid("  user123@gmail.com  ")).toBe(true);
  });

  it.each(["User@gmail.com", "user@outlook.com", "user@gmail.COM", " user @gmail.com"])(
    "rejects invalid registration email %s",
    (email) => expect(isRegistrationEmailValid(email)).toBe(false)
  );

  it("allows valid lowercase email addresses for login while registration remains Gmail-only", () => {
    expect(isLoginEmailValid("harshita@demo.greenmart.test")).toBe(true);
    expect(isLegacyDemoEmail("harshita@demo.greenmart.test")).toBe(true);
    expect(isLoginEmailValid("admin@greenmart.com")).toBe(true);
    expect(isLoginEmailValid("  admin@example.org  ")).toBe(true);
    expect(isLoginEmailValid("not-an-email")).toBe(false);
    expect(isLoginEmailValid("Admin@greenmart.com")).toBe(false);
    expect(isRegistrationEmailValid("admin@greenmart.com")).toBe(false);
  });

  it("reports each missing password requirement", () => {
    expect(passwordRequirements("weak")).toHaveLength(5);
    expect(passwordValidationMessage("weak")).toContain("at least 8 characters");
    expect(passwordValidationMessage("ValidPass1!")).toBe("");
  });
});
