import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusText } from "./ui";

describe("StatusText", () => {
  it("shows the status as text", () => {
    render(<StatusText value="ACTIVE" />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });
});
