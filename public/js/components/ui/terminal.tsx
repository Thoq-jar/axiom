import { useEffect, useRef, useState } from "preact/hooks";

interface TerminalProps {
  wsUrl?: string;
}

interface Span {
  text: string;
  style: string;
}

interface Line {
  spans: Span[];
}

interface AnsiState {
  foreground?: string;
  background?: string;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
}

const ANSI_COLOR_TABLE: Record<number, string> = {
  30: "#000000",
  31: "#e06c75",
  32: "#98c379",
  33: "#e5c07b",
  34: "#61afef",
  35: "#c678dd",
  36: "#56b6c2",
  37: "#abb2bf",
  90: "#5c6370",
  91: "#e06c75",
  92: "#98c379",
  93: "#e5c07b",
  94: "#61afef",
  95: "#c678dd",
  96: "#56b6c2",
  97: "#ffffff",
  40: "#000000",
  41: "#e06c75",
  42: "#98c379",
  43: "#e5c07b",
  44: "#61afef",
  45: "#c678dd",
  46: "#56b6c2",
  47: "#abb2bf",
};

function ansiStateToStyle(state: AnsiState): string {
  const parts: string[] = [];
  if (state.foreground) parts.push(`color:${state.foreground}`);
  if (state.background) parts.push(`background:${state.background}`);
  if (state.bold) parts.push("font-weight:bold");
  if (state.dim) parts.push("opacity:0.5");
  if (state.italic) parts.push("font-style:italic");
  if (state.underline) parts.push("text-decoration:underline");
  return parts.join(";");
}

function parseAnsiToSpans(raw: string): Span[] {
  const spans: Span[] = [];
  const state: AnsiState = {
    bold: false,
    dim: false,
    italic: false,
    underline: false,
  };
  // deno-lint-ignore no-control-regex
  const sgrRegex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = sgrRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      spans.push({
        text: raw.slice(lastIndex, match.index),
        style: ansiStateToStyle(state),
      });
    }
    const codes = match[1].split(";").map(Number);
    for (const code of codes) {
      if (code === 0) {
        state.foreground = undefined;
        state.background = undefined;
        state.bold =
          state.dim =
          state.italic =
          state.underline =
            false;
      } else if (code === 1) state.bold = true;
      else if (code === 2) state.dim = true;
      else if (code === 3) state.italic = true;
      else if (code === 4) state.underline = true;
      else if (code >= 30 && code <= 37) {
        state.foreground = ANSI_COLOR_TABLE[code];
      } else if (code >= 90 && code <= 97) {
        state.foreground = ANSI_COLOR_TABLE[code];
      } else if (code >= 40 && code <= 47) {
        state.background = ANSI_COLOR_TABLE[code];
      } else if (code === 39) state.foreground = undefined;
      else if (code === 49) state.background = undefined;
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    spans.push({ text: raw.slice(lastIndex), style: ansiStateToStyle(state) });
  }
  return spans;
}

function stripNonSgrEscapes(raw: string): string {
  // deno-lint-ignore no-control-regex
  raw = raw.replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "");
  // deno-lint-ignore no-control-regex
  raw = raw.replace(/\x1b\[([0-9;]*)[A-LN-Za-z]/g, "");
  // deno-lint-ignore no-control-regex
  raw = raw.replace(/\x1b[^[]/g, "");
  return raw;
}

function processBackspaces(text: string): string {
  let result = "";
  for (const char of text) {
    if (char === "\x08") {
      result = result.slice(0, -1);
    } else {
      result += char;
    }
  }
  return result;
}

const KEY_SEQUENCES: Record<string, string> = {
  Enter: "\r",
  Backspace: "\x7f",
  Tab: "\t",
  Escape: "\x1b",
  ArrowUp: "\x1b[A",
  ArrowDown: "\x1b[B",
  ArrowRight: "\x1b[C",
  ArrowLeft: "\x1b[D",
  Home: "\x1b[H",
  End: "\x1b[F",
  Delete: "\x1b[3~",
  PageUp: "\x1b[5~",
  PageDown: "\x1b[6~",
};

export const Terminal = ({ wsUrl = "/shell" }: TerminalProps) => {
  const [lines, setLines] = useState<Line[]>([]);
  const [connected, setConnected] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const appendRawOutput = (raw: string) => {
    // deno-lint-ignore no-control-regex
    if (/\x1b\[2J/.test(raw)) {
      setLines([]);
      return;
    }
    const cleaned = stripNonSgrEscapes(raw);
    const normalized = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const rawLines = normalized.split("\n");

    setLines((previousLines) => {
      const nextLines = [...previousLines];
      rawLines.forEach((rawLine, index) => {
        if (index === 0 && nextLines.length > 0) {
          const lastLine = nextLines[nextLines.length - 1];
          const existingText = lastLine.spans.map((span) => span.text).join("");
          const merged = processBackspaces(existingText + rawLine);
          nextLines[nextLines.length - 1] = { spans: parseAnsiToSpans(merged) };
        } else {
          nextLines.push({
            spans: parseAnsiToSpans(processBackspaces(rawLine)),
          });
        }
      });
      return nextLines;
    });
  };

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const websocket = new WebSocket(`${protocol}//${location.host}${wsUrl}`);
    wsRef.current = websocket;

    websocket.onopen = () => setConnected(true);
    websocket.onclose = () => setConnected(false);
    websocket.onerror = () => setConnected(false);
    websocket.onmessage = (event) => appendRawOutput(event.data);

    return () => websocket.close();
  }, [wsUrl]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    event.preventDefault();

    if (event.altKey && event.key === "Backspace") {
      wsRef.current.send("\x17");
      return;
    }

    if (event.metaKey && event.key === "Backspace") {
      wsRef.current.send("\x15");
      return;
    }

    if (event.ctrlKey && !event.altKey && event.key.length === 1) {
      const code = event.key.toLowerCase().charCodeAt(0) - 96;
      if (code >= 1 && code <= 26) {
        wsRef.current.send(String.fromCharCode(code));
        return;
      }
    }

    const sequence = KEY_SEQUENCES[event.key];
    if (sequence) {
      wsRef.current.send(sequence);
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      wsRef.current.send(event.key);
    }
  };

  return (
    <div
      className="backdrop-blur-xl p-4 font-mono shadow-xl w-full h-full rounded-lg overflow-y-auto cursor-text outline-none"
      style={{
        background: "var(--ui-bg)",
        border: "1px solid var(--ui-border)",
      }}
      ref={scrollRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      // deno-lint-ignore no-explicit-any
      autoFocus={true as any}
    >
      <div
        className="text-xs mb-2"
        style={{ color: connected ? "#98c379" : "#e06c75" }}
      >
        {connected ? "● connected" : "● disconnected"}
      </div>
      <div
        className="whitespace-pre-wrap break-all text-sm leading-relaxed"
        style={{ color: "var(--accent)" }}
      >
        {lines.map((line, lineIndex) => (
          <div key={lineIndex}>
            {line.spans.map((span, spanIndex) => (
              <span key={spanIndex} style={span.style}>{span.text}</span>
            ))}
            {lineIndex === lines.length - 1 && (
              <span className="animate-pulse">█</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
