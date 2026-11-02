import React from "react";
import { render, screen, act } from "@testing-library/react";
import OfferCountdown from "./OfferCountdown.jsx";

const ONE_HOUR = 60 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

function futureDate(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function pastDate(offsetMs) {
  return new Date(Date.now() - offsetMs).toISOString();
}

function getHours(container) {
  const spans = container.querySelectorAll("span.font-mono");
  return spans[0]?.textContent;
}

function getMinutes(container) {
  const spans = container.querySelectorAll("span.font-mono");
  return spans[1]?.textContent;
}

function getSeconds(container) {
  const spans = container.querySelectorAll("span.font-mono");
  return spans[2]?.textContent;
}

describe("OfferCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders countdown for Upcoming offers", () => {
    const { container } = render(<OfferCountdown startAt={futureDate(2 * ONE_HOUR)} endAt={futureDate(5 * ONE_HOUR)} status="Upcoming" />);
    expect(screen.getByText("until start")).toBeInTheDocument();
    expect(getHours(container)).toBe("02");
    expect(getMinutes(container)).toBe("00");
    expect(getSeconds(container)).toBe("00");
    expect(screen.getByLabelText(/Starts in/)).toBeInTheDocument();
  });

  it("renders countdown for Active offers", () => {
    const { container } = render(<OfferCountdown startAt={pastDate(1 * ONE_HOUR)} endAt={futureDate(3 * ONE_HOUR)} status="Active" />);
    expect(screen.getByText("left")).toBeInTheDocument();
    expect(getHours(container)).toBe("03");
    expect(getMinutes(container)).toBe("00");
    expect(getSeconds(container)).toBe("00");
    expect(screen.getByLabelText(/Offer ends in/)).toBeInTheDocument();
  });

  it("renders nothing for Expired offers", () => {
    render(<OfferCountdown startAt={pastDate(5 * ONE_HOUR)} endAt={pastDate(1 * ONE_HOUR)} status="Expired" />);
    expect(screen.queryByText("until start")).not.toBeInTheDocument();
    expect(screen.queryByText("left")).not.toBeInTheDocument();
  });

  it("renders nothing for Pending offers", () => {
    render(<OfferCountdown startAt={futureDate(2 * ONE_HOUR)} endAt={futureDate(5 * ONE_HOUR)} status="Pending" />);
    expect(screen.queryByText("until start")).not.toBeInTheDocument();
    expect(screen.queryByText("left")).not.toBeInTheDocument();
  });

  it("renders nothing for Rejected offers", () => {
    render(<OfferCountdown startAt={futureDate(2 * ONE_HOUR)} endAt={futureDate(5 * ONE_HOUR)} status="Rejected" />);
    expect(screen.queryByText("until start")).not.toBeInTheDocument();
    expect(screen.queryByText("left")).not.toBeInTheDocument();
  });

  it("renders nothing for Inactive offers", () => {
    render(<OfferCountdown startAt={futureDate(2 * ONE_HOUR)} endAt={futureDate(5 * ONE_HOUR)} status="Inactive" />);
    expect(screen.queryByText("until start")).not.toBeInTheDocument();
    expect(screen.queryByText("left")).not.toBeInTheDocument();
  });

  it("updates countdown every second", () => {
    const { container } = render(<OfferCountdown startAt={futureDate(2 * ONE_HOUR + 30 * ONE_MINUTE)} endAt={futureDate(5 * ONE_HOUR)} status="Upcoming" />);
    expect(getHours(container)).toBe("02");
    expect(getMinutes(container)).toBe("30");
    expect(getSeconds(container)).toBe("00");

    act(() => {
      vi.advanceTimersByTime(ONE_MINUTE);
    });
    expect(getHours(container)).toBe("02");
    expect(getMinutes(container)).toBe("29");
    expect(getSeconds(container)).toBe("00");
  });

  it("stops at zero when countdown reaches target", () => {
    const { container } = render(<OfferCountdown startAt={futureDate(ONE_MINUTE)} endAt={futureDate(2 * ONE_HOUR)} status="Upcoming" />);
    expect(getHours(container)).toBe("00");
    expect(getMinutes(container)).toBe("01");
    expect(getSeconds(container)).toBe("00");

    act(() => {
      vi.advanceTimersByTime(ONE_MINUTE);
    });
    // Countdown should be finished (0 or less), component returns null
    expect(container.querySelector('[aria-live="polite"]')).not.toBeInTheDocument();
  });

  it("clears interval on unmount", () => {
    const { unmount } = render(<OfferCountdown startAt={futureDate(2 * ONE_HOUR)} endAt={futureDate(5 * ONE_HOUR)} status="Upcoming" />);
    unmount();
    // Should not throw when timers advance after unmount
    expect(() => {
      act(() => { vi.advanceTimersByTime(ONE_MINUTE); });
    }).not.toThrow();
  });

  it("recalculates with different server time", () => {
    const { container, rerender } = render(<OfferCountdown startAt={futureDate(2 * ONE_HOUR)} endAt={futureDate(5 * ONE_HOUR)} status="Upcoming" />);
    expect(getHours(container)).toBe("02");
    expect(getMinutes(container)).toBe("00");

    // Simulate server time changing (e.g., after tab refocus)
    rerender(<OfferCountdown startAt={futureDate(2 * ONE_HOUR)} endAt={futureDate(5 * ONE_HOUR)} status="Upcoming" serverTime="2026-11-10T11:00:00Z" />);
    expect(getHours(container)).toBe("01");
    expect(getMinutes(container)).toBe("00");
  });

  it("shows zero correctly when countdown reaches target exactly", () => {
    render(<OfferCountdown startAt={futureDate(0)} endAt={futureDate(ONE_HOUR)} status="Upcoming" />);
    // startAt === now, so remaining is 0, component returns null
    expect(screen.queryByText(/00 : 00 : 00/)).not.toBeInTheDocument();
  });
});
