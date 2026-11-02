import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CartTable from "./CartTable.jsx";

describe("CartTable responsive items", () => {
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
