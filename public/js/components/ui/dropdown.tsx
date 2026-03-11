import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Icon } from "./icon.tsx";
import { Button } from "./button.tsx";

interface DropdownProps {
  id: string;
  title: string;
  children: ComponentChildren;
  isOpen?: boolean;
}

export const Dropdown = (
  { id, title, children, isOpen: initialOpen = false }: DropdownProps,
) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const handleToggle = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div
      class={`rounded-xl mb-4 opacity-0 translate-y-5 border backdrop-blur-sm  will-change-transform ${
        isOpen
          ? "border-(--accent)"
          : "border-(--ui-border) hover:border-(--border-accent)"
      }`}
      style={{
        background: "var(--ui-bg)",
        animation: "fadeSlideIn 0.5s ease forwards",
      }}
      data-dropdown={id}
    >
      <Button
        class="w-full py-5 px-6 bg-transparent border-none flex items-center justify-between cursor-pointer text-(--text-primary) font-[inherit] text-base font-semibold transition-all duration-200 hover:bg-(--ui-bg-hover)"
        onClick={handleToggle}
      >
        <span>{title}</span>
        <Icon
          name="chevron-down"
          class={`transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>
      <div
        class={`px-6 pb-6 ${isOpen ? "block" : "hidden"}`}
        style={{ animation: isOpen ? "dropdownSlide 0.3s ease" : undefined }}
        data-dropdown-content={id}
      >
        {children}
      </div>
    </div>
  );
};
