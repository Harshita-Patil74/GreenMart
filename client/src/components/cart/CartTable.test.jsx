import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CartTable from "./CartTable.jsx";

describe("CartTable responsive items", () => {
  it("shows original and discounted prices plus the server-calculated saving on mobile", () => {
    render(
      <CartTable
        items={[{
          quantity: 2,
          product: { _id: "product-discounted", name: "Organic Mangoes", price: 999, unit: "kg" },
          offer: { title: "10% off", appliedDiscount: 199.8, finalUnitPrice: 899.1, lineTotal: 1798.2 },
        }]}
        onUpdate={() => {}}
        onRemove={() => {}}
      />
    );

    const mobileCard = screen.getByRole("article");
    expect(within(mobileCard).getByText("₹ 899.10")).toBeInTheDocument();
    expect(within(mobileCard).getByText("₹ 999.00 / kg")).toHaveClass("line-through");
    expect(within(mobileCard).getByText("₹ 1,798.20")).toBeInTheDocument();
    expect(mobileCard).toHaveTextContent("Saved ₹ 199.80");
  });

  it("shows regular and Premium savings separately for eligible cart items", () => {
    render(
      <CartTable
        items={[{
          quantity: 1,
          product: { _id: "product-premium", name: "Fresh Marigold Flowers", price: 80, unit: "kg" },
          offer: { title: "Marigold offer", appliedDiscount: 21, premiumDiscount: 5, finalUnitPrice: 59, lineTotal: 59 },
        }]}
        onUpdate={() => {}}
        onRemove={() => {}}
      />
    );

    const mobileCard = screen.getByRole("article");
    expect(within(mobileCard).getByText("Regular savings: ₹ 16.00")).toBeInTheDocument();
    expect(within(mobileCard).getByText("Premium savings: ₹ 5.00")).toBeInTheDocument();
  });

  it("labels an unapplied Premium-only offer without showing it as a saving", () => {
    render(
      <CartTable
        items={[{
          quantity: 1,
          product: {
            _id: "product-exclusive",
            name: "Premium Dates",
            price: 100,
            subscriberOffer: { title: "Subscriber Dates Special", premiumDiscountAmount: 10 },
          },
        }]}
        onUpdate={() => {}}
        onRemove={() => {}}
      />
    );

    const mobileCard = screen.getByRole("article");
    expect(within(mobileCard).getByText("Premium subscribers only")).toBeInTheDocument();
    expect(within(mobileCard).queryByText(/Premium savings:/)).not.toBeInTheDocument();
    expect(mobileCard).toHaveTextContent("₹ 100.00 / kg");
  });

  it("renders cart item details and actions in the mobile card layout", () => {
    const onUpdate = vi.fn();
    const onRemove = vi.fn();
    render(
      <CartTable
        items={[
          {
            id: "cart-item-1",
            quantity: 2,
            product: {
              _id: "product-1",
              name: "Fresh Apples",
              category: "Fruit",
              price: 60,
              unit: "kg",
              images: ["/uploads/apples.png"],
            },
          },
        ]}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    );

    const mobileCard = screen.getByRole("article");
    expect(within(mobileCard).getByText("Fresh Apples")).toBeInTheDocument();
    expect(within(mobileCard).getByText("₹ 120.00")).toBeInTheDocument();
    fireEvent.click(within(mobileCard).getByRole("button", { name: "Increase Fresh Apples quantity" }));
    expect(onUpdate).toHaveBeenCalledWith("product-1", 3);
    fireEvent.click(within(mobileCard).getByRole("button", { name: "Remove Fresh Apples" }));
    expect(onRemove).toHaveBeenCalledWith("product-1");
  });
});
