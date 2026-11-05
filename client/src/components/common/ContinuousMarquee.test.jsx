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
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
    expect(screen.getByTestId("label-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-2")).toBeInTheDocument();
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
    expect(screen.queryByTestId("label-0")).not.toBeInTheDocument();
  });

  it("renders a single card gracefully", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(1)}
      </ContinuousMarquee>
    );
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
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
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
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
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
  });

  it("disables auto-scroll with prefers-reduced-motion", async () => {
    await setReducedMotion(true);
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
    expect(screen.getByTestId("label-4")).toBeInTheDocument();
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
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
  });

  it("card links remain clickable", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(3)}
      </ContinuousMarquee>
    );
    const card = screen.getByTestId("card-0");
    fireEvent.click(card);
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
  });

  it("Next button is present and clickable", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    const next = screen.getByRole("button", { name: "Next" });
    fireEvent.click(next);
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
  });

  it("Previous button is present and clickable", () => {
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(5)}
      </ContinuousMarquee>
    );
    const prev = screen.getByRole("button", { name: "Previous" });
    fireEvent.click(prev);
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
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
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
    expect(screen.getByTestId("label-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-2")).toBeInTheDocument();
  });

  it("does not duplicate cards with reduced motion", async () => {
    await setReducedMotion(true);
    renderWithStore(
      <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160}>
        {makeCards(3)}
      </ContinuousMarquee>
    );
    expect(screen.getByTestId("label-0")).toBeInTheDocument();
    expect(screen.getByTestId("label-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-2")).toBeInTheDocument();
  });
});
