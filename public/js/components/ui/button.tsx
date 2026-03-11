import { ComponentChildren } from "preact";

interface ButtonProps {
  children?: ComponentChildren;
  onClick?: (event: Event) => void;
  type?: "button" | "submit" | "reset";
  class?: string;
  disabled?: boolean;
  id?: string;
  title?: string;
}

export function Button({
  children,
  onClick,
  type = "button",
  class: className = "",
  disabled = false,
  id,
  title,
}: ButtonProps) {
  return (
    <button
      type={type}
      class={className}
      onClick={onClick}
      disabled={disabled}
      id={id}
      title={title}
    >
      {children}
    </button>
  );
}
