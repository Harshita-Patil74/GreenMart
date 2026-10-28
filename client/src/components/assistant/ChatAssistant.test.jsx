import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import assistantApi from "../../api/assistantApi.js";
import { ChatAssistant } from "./ChatAssistant.jsx";

vi.mock("../../api/assistantApi.js", () => ({
  default: { chat: vi.fn() },
}));

describe("ChatAssistant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends customer questions to the backend and displays Gemini responses", async () => {
    assistantApi.chat.mockResolvedValueOnce({
      data: { reply: "Organic apples are available.", products: [] },
    });
    renderWithStore(<ChatAssistant />);

    fireEvent.change(screen.getByLabelText("Ask the AI Shopping Assistant"), {
      target: { value: "Do you have organic apples?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Organic apples are available.")).toBeInTheDocument();
    expect(assistantApi.chat).toHaveBeenCalledWith({
      message: "Do you have organic apples?",
      history: [],
    });
  });

  it("shows configuration errors returned by the backend", async () => {
    assistantApi.chat.mockRejectedValueOnce({
      message: "The configured Gemini model is unavailable. Check GEMINI_MODEL in the server environment.",
      status: 503,
    });
    renderWithStore(<ChatAssistant />);

    fireEvent.change(screen.getByLabelText("Ask the AI Shopping Assistant"), {
      target: { value: "Suggest a fruit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Check GEMINI_MODEL");
    });
  });
});
