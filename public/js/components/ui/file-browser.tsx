import { useEffect, useRef, useState } from "preact/hooks";
import type { editor as monacoEditor } from "monaco-editor";
import { Icon } from "./icon.tsx";
import { Modal } from "./modal.tsx";
import { Button } from "./button.tsx";
import { MonacoEditor } from "./monaco-editor.tsx";

interface FileEntry {
  name: string;
  isDir: boolean;
  isLink: boolean;
  size: number;
}

interface FileBrowserProps {
  containerId: string;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

function FileEditor(
  { containerId, filePath, onClose }: {
    containerId: string;
    filePath: string;
    onClose: () => void;
  },
) {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const filename = filePath.split("/").pop() ?? filePath;

  useEffect(() => {
    fetch(
      `/api/container/${containerId}/file?path=${encodeURIComponent(filePath)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setContent(data.content);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load file");
        setLoading(false);
      });
  }, [filePath]);

  const save = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const value = editorRef.current.getValue();
      const res = await fetch(`/api/container/${containerId}/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: value }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg("Saved");
        setTimeout(() => setSaveMsg(null), 2000);
      } else {
        setSaveMsg(data.error ?? "Save failed");
      }
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={filename}
      icon="file-text"
      onClose={onClose}
      class="max-w-225!"
    >
      <div class="flex flex-col" style={{ height: "560px" }}>
        <div class="flex items-center justify-between px-4 py-2 shrink-0 bg-(--bg-secondary)">
          <span
            class="text-[0.75rem] text-(--text-muted) font-mono truncate max-w-[60%]"
            title={filePath}
          >
            {filePath}
          </span>
          <div class="flex items-center gap-2">
            {saveMsg && (
              <span
                class={`text-[0.75rem] ${
                  saveMsg === "Saved" ? "text-success" : "text-danger"
                }`}
              >
                {saveMsg}
              </span>
            )}
            <Button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold border border-(--accent) text-(--accent) bg-(--accent-dim) hover:bg-(--accent) hover:text-white cursor-pointer transition-all disabled:opacity-50"
              onClick={save}
              disabled={saving || loading || !!error}
            >
              <Icon name="save" size={13} />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div class="flex-1 min-h-0 relative">
          {loading && (
            <div class="absolute inset-0 flex items-center justify-center text-(--text-muted) text-sm gap-2 bg-(--bg-card)">
              <Icon name="loader" size={14} class="animate-spin" />
              Loading…
            </div>
          )}
          {error && (
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-(--bg-card)">
              <Icon name="alert-circle" size={20} class="text-danger" />
              <span class="text-[0.85rem] text-danger">{error}</span>
            </div>
          )}
          {!loading && !error && (
            <MonacoEditor
              value={content}
              filename={filename}
              onMount={(ed) => {
                editorRef.current = ed;
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

export function FileBrowser({ containerId, onClose }: FileBrowserProps) {
  const [path, setPath] = useState("/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);

  const navigate = (newPath: string) => {
    setLoading(true);
    setError(null);
    fetch(
      `/api/container/${containerId}/files?path=${encodeURIComponent(newPath)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPath(data.path);
          setEntries(data.entries);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch files");
        setLoading(false);
      });
  };

  useEffect(() => {
    navigate("/");
  }, [containerId]);

  const goUp = () => {
    if (path === "/") return;
    const parent = path.split("/").slice(0, -1).join("/") || "/";
    navigate(parent);
  };

  const pathParts = path === "/" ? [""] : path.split("/");

  return (
    <>
      <Modal
        title="File Browser"
        icon="folder-open"
        onClose={onClose}
        class="max-w-170!"
      >
        <div class="flex flex-col" style={{ height: "460px" }}>
          <div class="flex items-center gap-0.5 px-4 py-2.5 shrink-0 overflow-x-auto bg-(--bg-secondary)">
            <Icon
              name="folder"
              size={12}
              class="text-(--text-muted) shrink-0 mr-1"
            />
            {pathParts.map((part, i) => {
              const crumbPath = i === 0
                ? "/"
                : pathParts.slice(0, i + 1).join("/");
              return (
                <span key={i} class="flex items-center gap-0.5">
                  {i > 0 && (
                    <span class="text-(--text-muted) text-xs select-none">
                      /
                    </span>
                  )}
                  <button
                    type="button"
                    class="text-[0.78rem] text-(--accent) hover:text-(--text-primary) bg-transparent border-none cursor-pointer px-1 py-0.5 rounded transition-colors whitespace-nowrap font-mono"
                    onClick={() => navigate(crumbPath)}
                  >
                    {i === 0 ? "root" : part}
                  </button>
                </span>
              );
            })}
          </div>

          <div class="flex-1 overflow-y-auto">
            {loading
              ? (
                <div class="flex items-center justify-center h-full text-(--text-muted) text-sm gap-2">
                  <Icon name="loader" size={14} class="animate-spin" />
                  Loading...
                </div>
              )
              : error
              ? (
                <div class="flex flex-col items-center justify-center h-full gap-2 px-8 text-center">
                  <Icon name="alert-circle" size={20} class="text-danger" />
                  <span class="text-[0.85rem] text-danger">{error}</span>
                </div>
              )
              : (
                <div>
                  {path !== "/" && (
                    <div
                      class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-(--bg-secondary) transition-colors"
                      onClick={goUp}
                    >
                      <Icon
                        name="arrow-left"
                        size={13}
                        class="text-(--text-muted) shrink-0"
                      />
                      <span class="text-[0.82rem] text-(--text-muted) font-mono">
                        ..
                      </span>
                    </div>
                  )}
                  {entries.length === 0 && (
                    <div class="px-4 py-10 text-center text-[0.82rem] text-(--text-muted)">
                      Empty directory
                    </div>
                  )}
                  {entries.map((entry) => {
                    const entryPath = path === "/"
                      ? `/${entry.name}`
                      : `${path}/${entry.name}`;
                    return (
                      <div
                        key={entry.name}
                        class="flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer hover:bg-(--bg-secondary)"
                        onClick={() =>
                          entry.isDir
                            ? navigate(entryPath)
                            : setEditingFile(entryPath)}
                      >
                        <Icon
                          name={entry.isDir ? "folder" : "file-text"}
                          size={14}
                          class={`shrink-0 ${
                            entry.isDir
                              ? "text-(--accent)"
                              : "text-(--text-muted)"
                          }`}
                        />
                        <span
                          class={`flex-1 min-w-0 truncate text-[0.82rem] font-mono ${
                            entry.isDir
                              ? "text-(--text-primary)"
                              : "text-(--text-secondary)"
                          }`}
                          title={entry.name}
                        >
                          {entry.name}
                          {entry.isLink ? " →" : ""}
                        </span>
                        <span class="text-[0.75rem] text-(--text-muted) tabular-nums shrink-0 w-12 text-right">
                          {entry.isDir ? "" : formatSize(entry.size)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>

          <div class="px-4 py-3 flex justify-end shrink-0">
            <Button
              class="px-4 py-2 rounded-lg text-[0.82rem] font-semibold text-(--text-secondary) bg-transparent cursor-pointer hover:text-(--text-primary) hover:bg-(--bg-secondary) transition-all"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {editingFile && (
        <FileEditor
          containerId={containerId}
          filePath={editingFile}
          onClose={() => setEditingFile(null)}
        />
      )}
    </>
  );
}
