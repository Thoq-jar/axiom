import { useEffect, useRef } from "preact/hooks";
import * as monaco from "monaco-editor";

export function guessLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    html: "html",
    css: "css",
    scss: "scss",
    xml: "xml",
    toml: "toml",
    ini: "ini",
    conf: "ini",
    dockerfile: "dockerfile",
    sql: "sql",
    c: "c",
    cpp: "cpp",
    h: "cpp",
    txt: "plaintext",
    log: "plaintext",
    env: "ini",
    csv: "plaintext",
    lua: "lua",
    swift: "swift",
    kt: "kotlin",
    java: "java",
    php: "php",
  };
  if (filename.toLowerCase() === "dockerfile") return "dockerfile";
  return map[ext] ?? "plaintext";
}

interface MonacoEditorProps {
  value: string;
  language?: string;
  filename?: string;
  readOnly?: boolean;
  height?: string;
  class?: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export function MonacoEditor(
  { value, language, filename, readOnly, height, class: cls, onMount }:
    MonacoEditorProps,
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const lang = language ?? (filename ? guessLanguage(filename) : "plaintext");
    monacoRef.current = monaco.editor.create(editorRef.current, {
      value,
      language: lang,
      theme: "vs-dark",
      fontSize: 13,
      fontFamily: "monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: "on",
      readOnly: readOnly ?? false,
      padding: { top: 12, bottom: 12 },
    });
    if (onMount) onMount(monacoRef.current);
    return () => monacoRef.current?.dispose();
  }, []);

  return (
    <div
      ref={editorRef}
      class={`w-full ${cls ?? ""}`}
      style={{ height: height ?? "100%" }}
    />
  );
}
