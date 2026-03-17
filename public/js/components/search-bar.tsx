import { useRef, useState } from "preact/hooks";
import { SEARCH_ENGINES } from "../utils/lib.ts";
import { Icon } from "./ui/icon.tsx";

const getSearchUrl = (query: string): string => {
  const engine = localStorage.getItem("searchEngine") || "google";
  const template = engine === "custom"
    ? (localStorage.getItem("customSearchUrl") || SEARCH_ENGINES.google)
    : (SEARCH_ENGINES[engine] || SEARCH_ENGINES.google);
  return template.replace("%s", encodeURIComponent(query));
};

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event?: Event) => {
    event?.preventDefault();
    if (!query.trim()) return;
    globalThis.open(getSearchUrl(query.trim()), "_blank", "noopener");
    setQuery("");
  };

  return (
    <div
      class="relative mb-6 opacity-0"
      style={{ animation: "fadeSlideIn 0.5s ease 0.2s forwards" }}
    >
      <form
        class="flex items-center gap-2 rounded-[10px] py-2.5 px-3 transition-all duration-200 backdrop-blur-sm will-change-transform"
        style={{ background: "var(--ui-bg)" }}
        onSubmit={handleSubmit}
      >
        <Icon
          name="search"
          size={16}
          class="text-(--text-muted) shrink-0"
        />
        <input
          ref={inputRef}
          class="flex-1 bg-transparent border-none outline-none text-(--text-primary) font-[inherit] text-[0.9rem] placeholder:text-(--text-muted)"
          type="text"
          placeholder="Search the web…"
          value={query}
          onInput={(event) =>
            setQuery((event.target as HTMLInputElement).value)}
          autoComplete="off"
          spellcheck={false}
        />
        {query && (
          <button
            type="button"
            class="bg-transparent border-none text-(--text-muted) cursor-pointer p-0.5 flex items-center rounded transition-all duration-200 hover:text-(--text-primary) hover:bg-(--bg-secondary)"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </form>
    </div>
  );
};
