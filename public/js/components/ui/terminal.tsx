import { useEffect, useRef, useState } from "preact/hooks";

interface TerminalProps {
  onCommand: (command: string) => string | void;
}

export const Terminal = ({ onCommand }: TerminalProps) => {
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const PREFIX = ">>> ";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, input]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const command = input.trim();
      const newHistory = [...history, `${PREFIX}${input}`];

      if (command.toLowerCase() === "clear") {
        setHistory([]);
      } else if (command) {
        const result = onCommand(command);
        if (result) newHistory.push(result);
        setHistory(newHistory);
        setCmdHistory((prev) => [...prev, command]);
      } else {
        setHistory(newHistory);
      }

      setInput("");
      setHistoryIndex(-1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (cmdHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, cmdHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div
      className="bg-black/40 backdrop-blur-xl p-4 font-mono shadow-xl w-full h-full border border-white/5 rounded-lg overflow-y-auto cursor-text"
      onClick={() => inputRef.current?.focus()}
      ref={scrollRef}
    >
      <div
        className="whitespace-pre-wrap break-all text-sm leading-relaxed"
        style={{ color: "var(--accent)" }}
      >
        {history.map((line, i) => <div key={i}>{line}</div>)}
        <div className="flex">
          <span className="shrink-0">{PREFIX}</span>
          <span className="break-all">
            {input}
            <span className="animate-pulse">█</span>
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute pointer-events-none"
        value={input}
        onInput={(e) => setInput((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        autoFocus
        spellcheck={false}
      />
    </div>
  );
};
