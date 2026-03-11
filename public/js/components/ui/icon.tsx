import * as Lucide from "lucide";
import { h } from "preact";

interface IconProps {
  name: string;
  size?: number;
  class?: string;
}

const renderLucideNode = (node: unknown): unknown => {
  if (!node) return null;

  if (typeof node === "string") return node;

  if (Array.isArray(node)) {
    const [tag, attrs, children] = node;

    if (typeof tag !== "string") {
      return renderLucideNode(tag);
    }

    const renderedChildren = Array.isArray(children)
      ? children.map(renderLucideNode)
      : children;

    return h(tag, attrs, renderedChildren);
  }

  return node;
};

export function Icon({ name, size = 16, class: className }: IconProps) {
  const iconName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as keyof typeof Lucide;

  const lucideNode = Lucide[iconName];

  if (!lucideNode) {
    return h("span", { class: className || "" }, "?");
  }

  const [tag, attrs, children] = lucideNode as [
    string,
    Record<string, unknown>,
    unknown[],
  ];

  const finalAttrs: Record<string, unknown> = { ...attrs, class: className };
  if (size) {
    finalAttrs.width = size;
    finalAttrs.height = size;
  }

  const renderedChildren = Array.isArray(children)
    ? children.map(renderLucideNode)
    : children;

  return h(tag, finalAttrs, renderedChildren);
}
