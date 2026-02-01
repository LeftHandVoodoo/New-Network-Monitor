import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function Demo() {
  return <h1>Ready</h1>;
}

describe("testing setup", () => {
  it("has jest-dom matchers", () => {
    render(<Demo />);
    expect(screen.getByRole("heading", { name: /ready/i })).toBeInTheDocument();
  });
});
