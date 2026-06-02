import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "@/components/ui/Button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>クリック</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("クリック");
  });

  it("calls onClick when clicked", () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>ボタン</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is passed", () => {
    render(<Button disabled>無効</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = jest.fn();
    render(<Button disabled onClick={onClick}>無効</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies primary variant classes by default", () => {
    render(<Button>プライマリ</Button>);
    expect(screen.getByRole("button").className).toContain("bg-green");
  });

  it("applies secondary variant classes when specified", () => {
    render(<Button variant="secondary">セカンダリ</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("border");
    expect(btn.className).not.toContain("bg-[#1D9E75]");
  });

  it("renders as submit button when type is submit", () => {
    render(<Button type="submit">送信</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
