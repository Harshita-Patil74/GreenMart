import React from "react";
import { render, screen } from "@testing-library/react";
import OrderSummary from "./OrderSummary.jsx";

describe("Order Summary", () => {
  it("shows subtotal, delivery, savings, final total, and checkout action", () => {
    render(
      <OrderSummary
        subtotal={80}
        delivery={30}
        discount={5}
        total={105}
        buttonLabel="Proceed to Checkout"
        onAction={() => {}}
      />
    );

    expect(screen.getByText("Order Summary")).toBeInTheDocument();
    expect(screen.getByText("Original Product Subtotal")).toBeInTheDocument();
    expect(screen.getByText("₹ 80.00")).toBeInTheDocument();
    expect(screen.getByText("Regular Offer Savings")).toBeInTheDocument();
    expect(screen.getByText("Exclusive Subscriber Savings")).toBeInTheDocument();
    expect(screen.getByText("Total Discount")).toBeInTheDocument();
    expect(screen.getByText("Delivery Charge")).toBeInTheDocument();
    expect(screen.getByText("₹ 30.00")).toBeInTheDocument();
    expect(screen.getAllByText("− ₹ 5.00")).toHaveLength(2);
    expect(screen.getByText("Final Payable Amount")).toBeInTheDocument();
    expect(screen.getByText("₹ 105.00")).toBeInTheDocument();
    expect(screen.getByText("You saved ₹ 5.00 on this order.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proceed to Checkout" })).toBeEnabled();
  });

  it("displays regular and Premium savings as separate amounts", () => {
    render(
      <OrderSummary
        subtotal={80}
        regularDiscount={16}
        premiumDiscount={5}
        discount={21}
        delivery={30}
        total={89}
      />
    );

    expect(screen.getByText("− ₹ 16.00")).toBeInTheDocument();
    expect(screen.getByText("− ₹ 5.00")).toBeInTheDocument();
    expect(screen.getByText("− ₹ 21.00")).toBeInTheDocument();
    expect(screen.getByText("₹ 89.00")).toBeInTheDocument();
  });
});
