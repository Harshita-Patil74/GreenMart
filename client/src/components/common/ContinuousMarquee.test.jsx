import React from "react";
import { act, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import ContinuousMarquee from "./ContinuousMarquee.jsx";

// Mock framer-motion so ContinuousMarquee can render without animation timing issues
vi.mock("framer-motion", () => {
  const React = require("react");

  const motion = {
    div: ({ children, style, ...props }) =>
      React.createElement("div", { style, ...props }, children),
    span: ({ children, ...props }) =>
      React.createElement("span", props, children),
    button: ({ children, ...props }) =>
      React.createElement("button", props, children),
  };

  let reducedMotion = false;
  return {
    motion,
    AnimatePresence: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    useReducedMotion: () => reducedMotion,
    useSpring: () => [0, () => {}],
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useAnimate: () => () => {},
    useMotionTemplate: () => "",
    useTransform: () => 0,
    useVelocity: () => 0,
    useCycle: () => [0, () => {}],
    useTime: () => 0,
    useIsPresent: () => true,
    useReducedMotionConfig: () => ({
      type: "spring",
      stiffness: 500,
      damping: 30,
    }),
    __setReducedMotion: (val) => {
      reducedMotion = val;
    },
  };
});

const Card = ({ id, label }) => (
  <div data-testid={`card-${id}`} style={{ minWidth: "120px", flex: "0 0 auto" }}>
    <span data-testid={`label-${id}`}>{label}</span>
  </div>
);

const makeCards = (n) =>
  Array.from({ length: n }, (_, i) => (
    <Card key={`card-${i}`} id={i} label={`Product ${i + 1}`} />
  ));

// Duplicates render 3 copies of each card, so use getAllByTestId and check length > 0
const hasTestId = (id) => screen.getAllByTestId(id).length > 0;
const hasNoTestId = (id) => screen.queryAllByTestId(id).length === 0;

const setReducedMotion = async (val) => {
  const mod = await vi.importMock("framer-motion");
  if (mod.__setReducedMotion) mod.__setReducedMotion(val);
};

describe("ContinuousMarquee", () => {
  beforeEach(async () => {
    await setReducedMotion(false);
  });

  it("renders cards without crashing", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(3)}
      </ContinuousMarquee>
    );
    expect(hasTestId("label-0")).toBe(true);
    expect(hasTestId("label-1")).toBe(true);
    expect(hasTestId("label-2")).toBe(true);
  });

  it("renders Previous and Next arrow controls with accessible labels", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("does not show controls when showControls is false", () => {
    renderWithStore(
      <ContinuousMarquee
        speed={50}
        gap={20}
        itemWidth={220}
        minItemWidth={160}
        showControls={false}
      >
        {makeCards(3)}
      </ContinuousMarquee>
    );
    expect(
      screen.queryByRole("button", { name: "Previous" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next" })
    ).not.toBeInTheDocument();
  });

  it("renders empty state gracefully with no children", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {[]}
      </ContinuousMarquee>
    );
    expect(hasNoTestId("label-0")).toBe(true);
  });

  it("renders a single card gracefully", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(1)}
      </ContinuousMarquee>
    );
    expect(hasTestId("label-0")).toBe(true);
  });

  it("pauses auto-scroll on mouse enter and resumes on mouse leave", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    const viewport = document.querySelector("[style*='overflow-x']");
    fireEvent.mouseEnter(viewport);
    fireEvent.mouseLeave(viewport);
    expect(hasTestId("label-0")).toBe(true);
  });

  it("pauses auto-scroll on focus and resumes on blur", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    const viewport = document.querySelector("[style*='overflow-x']");
    fireEvent.focus(viewport);
    fireEvent.blur(viewport);
    expect(hasTestId("label-0")).toBe(true);
  });

  it("disables auto-scroll with prefers-reduced-motion", async () => {
    await setReducedMotion(true);
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    expect(hasTestId("label-0")).toBe(true);
    expect(hasTestId("label-4")).toBe(true);
  });

  it("handles mouse drag: pointer down, move, up", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    const viewport = document.querySelector("[style*='overflow-x']");
    fireEvent.pointerDown(viewport, { button: 0, clientX: 100 });
    fireEvent.pointerMove(viewport, { button: 0, clientX: 50 });
    fireEvent.pointerUp(viewport, { button: 0 });
    expect(hasTestId("label-0")).toBe(true);
  });

  it("card links remain clickable", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(3)}
      </ContinuousMarquee>
    );
    const card = screen.getAllByTestId("card-0")[0];
    fireEvent.click(card);
    expect(hasTestId("label-0")).toBe(true);
  });

  it("Next button is present and clickable", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    const next = screen.getByRole("button", { name: "Next" });
    fireEvent.click(next);
    expect(hasTestId("label-0")).toBe(true);
  });

  it("Previous button is present and clickable", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    const prev = screen.getByRole("button", { name: "Previous" });
    fireEvent.click(prev);
    expect(hasTestId("label-0")).toBe(true);
  });

  it("disables Previous button at start position", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    const prev = screen.getByRole("button", { name: "Previous" });
    expect(prev).toBeDisabled();
  });

  it("renders duplicated cards for seamless loop (not reduced motion)", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(3)}
      </ContinuousMarquee>
    );
    expect(hasTestId("label-0")).toBe(true);
    expect(hasTestId("label-1")).toBe(true);
    expect(hasTestId("label-2")).toBe(true);
  });

  it("does not duplicate cards with reduced motion", async () => {
    await setReducedMotion(true);
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(3)}
      </ContinuousMarquee>
    );
    expect(hasTestId("label-0")).toBe(true);
    expect(hasTestId("label-1")).toBe(true);
    expect(hasTestId("label-2")).toBe(true);
  });

  // Regression: finite mode (infinite={false}) renders unique items only once
  // when there are too few items for infinite scrolling
  it("finite mode renders each card exactly once (no triple copies)", () => {
    renderWithStore(
      <ContinuousMarquee
        speed={50}
        gap={20}
        itemWidth={220}
        minItemWidth={160}
        infinite={false}
      >
        {makeCards(3)}
      </ContinuousMarquee>
    );
    // Each label should appear exactly once (not 3x as in infinite mode)
    expect(screen.getAllByTestId("label-0").length).toBe(1);
    expect(screen.getAllByTestId("label-1").length).toBe(1);
    expect(screen.getAllByTestId("label-2").length).toBe(1);
  });

  // Regression: infinite mode (default) renders triple copies for seamless loop
  it("infinite mode renders triple copies (3x each card)", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(3)}
      </ContinuousMarquee>
    );
    expect(screen.getAllByTestId("label-0").length).toBe(3);
    expect(screen.getAllByTestId("label-1").length).toBe(3);
    expect(screen.getAllByTestId("label-2").length).toBe(3);
  });

  // Regression: finite mode with a single card renders once, no duplicates
  it("finite mode renders single card exactly once", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160} infinite={false}>
        {makeCards(1)}
      </ContinuousMarquee>
    );
    expect(screen.getAllByTestId("label-0").length).toBe(1);
  });

  // Regression: finite mode with empty list renders nothing
  it("finite mode renders empty state with no children", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160} infinite={false}>
        {[]}
      </ContinuousMarquee>
    );
    expect(screen.queryAllByTestId("label-0").length).toBe(0);
  });
});
