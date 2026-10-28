import { getImageUrl } from "./imageUrl.js";

describe("getImageUrl", () => {
  it("resolves server upload paths against the API host", () => {
    const apiOrigin = new URL(import.meta.env.VITE_API_URL || "http://localhost:5000/api").origin;
    const expected = `${apiOrigin}/uploads/products/tomatoes.png`;
    expect(getImageUrl("/uploads/products/tomatoes.png")).toBe(expected);
    expect(getImageUrl("uploads/products/tomatoes.png")).toBe(expected);
    expect(getImageUrl("\\uploads\\products\\tomatoes.png")).toBe(expected);
  });

  it("preserves public and remote image URLs", () => {
    expect(getImageUrl("/images/products/tomatoes.jpg")).toBe("/images/products/tomatoes.jpg");
    expect(getImageUrl("https://example.com/tomatoes.jpg")).toBe("https://example.com/tomatoes.jpg");
    expect(getImageUrl("")).toBe("/images/placeholder.svg");
  });
});
