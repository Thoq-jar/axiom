import { useEffect, useRef, useState } from "preact/hooks";
import type { editor as MonacoEditorType } from "monaco-editor";
import { Icon } from "../components/ui/icon.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { MonacoEditor } from "../components/ui/monaco-editor.tsx";
import { useToast } from "../hooks/use-toast.ts";

interface FsEntry {
  name: string;
  isDir: boolean;
  isFile: boolean;
  size: number;
  modified: number;
}

interface FileMeta {
  usage: string;
  fileType: string;
  uploadedAt: number;
}

interface UploadFileItem {
  file: File;
  fileType: string;
  usage: string;
}

type SortKey = "name" | "size" | "modified" | "type";
type ViewMode = "list" | "icons";

interface BuiltinCategory {
  kind: "builtin";
  value: string;
  label: string;
  icon: string;
}

interface CustomCategory {
  kind: "custom";
  name: string;
}

type SidebarCategory = BuiltinCategory | CustomCategory;

const BUILTIN_CATEGORIES: BuiltinCategory[] = [
  { kind: "builtin", value: "all", label: "All Files", icon: "files" },
  { kind: "builtin", value: "system", label: "System Files", icon: "shield" },
  { kind: "builtin", value: "work", label: "Work", icon: "briefcase" },
  { kind: "builtin", value: "movies", label: "Movies", icon: "film" },
  { kind: "builtin", value: "music", label: "Music", icon: "music" },
  { kind: "builtin", value: "photos", label: "Photos", icon: "image" },
  {
    kind: "builtin",
    value: "documents",
    label: "Documents",
    icon: "file-text",
  },
  { kind: "builtin", value: "downloads", label: "Downloads", icon: "download" },
  { kind: "builtin", value: "games", label: "Games", icon: "gamepad-2" },
  { kind: "builtin", value: "other", label: "Other", icon: "folder" },
];

const FILE_TYPES = [
  "Video",
  "Audio",
  "Image",
  "Document",
  "Archive",
  "Code",
  "Data",
  "Other",
];

const BINARY_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "ico",
  "tiff",
  "heic",
  "mp4",
  "mkv",
  "avi",
  "mov",
  "webm",
  "flv",
  "wmv",
  "m4v",
  "mp3",
  "flac",
  "wav",
  "aac",
  "ogg",
  "m4a",
  "opus",
  "zip",
  "tar",
  "gz",
  "bz2",
  "xz",
  "7z",
  "rar",
  "tgz",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "sqlite",
  "db",
  "exe",
  "bin",
  "so",
  "dylib",
  "dll",
  "o",
  "a",
  "woff",
  "woff2",
  "ttf",
  "eot",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mkv",
  "webm",
  "avi",
  "mov",
  "m4v",
  "flv",
  "wmv",
]);
const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "flac",
  "wav",
  "aac",
  "ogg",
  "m4a",
  "opus",
]);

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDate(milliseconds: number): string {
  if (!milliseconds) return "—";
  return new Date(milliseconds).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isVideoFile(name: string): boolean {
  return VIDEO_EXTENSIONS.has(getExtension(name));
}

function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.has(getExtension(name));
}

function canOpenInMonaco(name: string): boolean {
  if (name.startsWith(".") && !name.slice(1).includes(".")) return true;
  return !BINARY_EXTENSIONS.has(getExtension(name));
}

function guessFileType(name: string): string {
  if (name.startsWith(".") && !name.slice(1).includes(".")) return "Code";
  const extension = getExtension(name);
  if (VIDEO_EXTENSIONS.has(extension)) return "Video";
  if (AUDIO_EXTENSIONS.has(extension)) return "Audio";
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "tiff"].includes(
      extension,
    )
  ) return "Image";
  if (
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "rtf"].includes(
      extension,
    )
  ) return "Document";
  if (
    ["zip", "tar", "gz", "bz2", "xz", "7z", "rar", "tgz"].includes(extension)
  ) return "Archive";
  if (
    [
      "js",
      "ts",
      "tsx",
      "jsx",
      "py",
      "go",
      "rs",
      "c",
      "cpp",
      "h",
      "java",
      "rb",
      "php",
      "sh",
      "bash",
      "zsh",
      "yaml",
      "yml",
      "json",
      "toml",
      "xml",
      "html",
      "css",
      "scss",
      "sql",
      "md",
      "lua",
      "swift",
      "kt",
      "env",
      "conf",
      "ini",
      "cfg",
      "gitignore",
      "dockerfile",
    ].includes(extension)
  ) return "Code";
  if (["csv", "tsv", "sqlite", "db", "parquet"].includes(extension)) {
    return "Data";
  }
  return "Other";
}

function typeIcon(fileType: string): string {
  switch (fileType) {
    case "Video":
      return "film";
    case "Audio":
      return "music";
    case "Image":
      return "image";
    case "Document":
      return "file-text";
    case "Archive":
      return "archive";
    case "Code":
      return "code";
    case "Data":
      return "database";
    default:
      return "file";
  }
}

function typeBadgeColor(fileType: string): string {
  switch (fileType) {
    case "Video":
      return "bg-[rgba(139,92,246,0.15)] text-[#a78bfa]";
    case "Audio":
      return "bg-[rgba(236,72,153,0.15)] text-[#f472b6]";
    case "Image":
      return "bg-[rgba(34,197,94,0.15)] text-success";
    case "Document":
      return "bg-[rgba(59,130,246,0.15)] text-[#60a5fa]";
    case "Archive":
      return "bg-[rgba(234,179,8,0.15)] text-warning";
    case "Code":
      return "bg-[rgba(99,102,241,0.15)] text-[#818cf8]";
    case "Data":
      return "bg-[rgba(20,184,166,0.15)] text-[#2dd4bf]";
    default:
      return "bg-(--accent-dim) text-(--text-muted)";
  }
}

function streamUrl(filePath: string): string {
  return `/api/fs/stream?path=${encodeURIComponent(filePath)}`;
}

function SidebarBtn(
  { icon, label, active, onClick, onDelete, onFileDrop }: {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
    onDelete?: () => void;
    onFileDrop?: (filePath: string) => void;
  },
) {
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  return (
    <div
      class="group flex items-center gap-0"
      onDragOver={(e) => {
        if (onFileDrop) {
          e.preventDefault();
          setIsFileDragOver(true);
        }
      }}
      onDragLeave={() => setIsFileDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsFileDragOver(false);
        const path = e.dataTransfer?.getData("text/plain");
        if (path && onFileDrop) onFileDrop(path);
      }}
    >
      <button
        type="button"
        class={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.83rem] border-none cursor-pointer transition-all text-left ${
          active
            ? "text-(--accent) font-semibold"
            : "bg-transparent text-(--text-muted) hover:text-(--text-secondary)"
        }`}
        style={isFileDragOver
          ? {
            background: "rgba(var(--accent-rgb,139,92,246),0.2)",
            color: "var(--accent)",
          }
          : active
          ? { background: "rgba(var(--accent-rgb,139,92,246),0.12)" }
          : undefined}
        onMouseEnter={(e) => {
          if (!active && !isFileDragOver) {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(var(--accent-rgb,139,92,246),0.06)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active && !isFileDragOver) {
            (e.currentTarget as HTMLElement)
              .style.background = "transparent";
          }
        }}
        onClick={onClick}
      >
        <Icon name={icon} size={14} />
        {label}
      </button>
      {onDelete && (
        <button
          type="button"
          class="opacity-0 group-hover:opacity-100 bg-transparent border-none text-(--text-muted) hover:text-danger cursor-pointer px-1 py-1 transition-all leading-none shrink-0"
          onClick={onDelete}
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
}

function SortBtn(
  { label, sortKey, active, ascending, onSort }: {
    label: string;
    sortKey: SortKey;
    active: boolean;
    ascending: boolean;
    onSort: (key: SortKey) => void;
  },
) {
  return (
    <button
      type="button"
      class={`flex items-center gap-1 text-[0.78rem] border-none bg-transparent cursor-pointer px-2 py-1 rounded transition-colors ${
        active
          ? "text-(--accent) font-semibold"
          : "text-(--text-muted) hover:text-(--text-secondary)"
      }`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && (
        <Icon name={ascending ? "chevron-up" : "chevron-down"} size={11} />
      )}
    </button>
  );
}

function DropArea({ onFiles }: { onFiles: (files: FileList) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      class="border-2 border-dashed border-(--accent) rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-(--accent-dim) transition-colors"
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer?.files) onFiles(event.dataTransfer.files);
      }}
      onDragOver={(event) => event.preventDefault()}
      onClick={() => inputRef.current?.click()}
    >
      <Icon name="upload-cloud" size={32} class="text-(--accent)" />
      <p class="text-[0.9rem] text-(--text-secondary) text-center">
        Drop files here or{" "}
        <span class="text-(--accent) font-semibold">click to browse</span>
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        class="hidden"
        onChange={(event) => {
          const target = event.target as HTMLInputElement;
          if (target.files) onFiles(target.files);
        }}
      />
    </div>
  );
}

function AudioPlayer(
  { filePath, onClose }: { filePath: string; onClose: () => void },
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const filename = filePath.split("/").pop() ?? filePath;
  const nameWithoutExtension = filename.replace(/\.[^.]+$/, "");

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
  };

  const skip = (seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime += seconds;
  };

  return (
    <Modal title="" icon="music" onClose={onClose} class="max-w-96!">
      <audio
        ref={audioRef}
        src={streamUrl(filePath)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onVolumeChange={() => setVolume(audioRef.current?.volume ?? 1)}
        onEnded={() => setPlaying(false)}
      />

      <div class="flex flex-col items-center gap-6 p-8 pb-6">
        <div
          class="w-36 h-36 rounded-3xl flex items-center justify-center relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(var(--accent-rgb,139,92,246),0.3), rgba(var(--accent-rgb,139,92,246),0.05))",
          }}
        >
          <Icon
            name="music"
            size={52}
            class="text-(--accent) opacity-80"
          />
          {playing && (
            <div class="absolute bottom-4 flex items-end gap-0.5">
              {[0, 80, 160, 240, 320].map((delay) => (
                <div
                  key={delay}
                  class="w-1 rounded-full"
                  style={{
                    height: "16px",
                    background: "var(--accent, #6366f1)",
                    opacity: 0.8,
                    animation: `audioBeat 0.7s ease-in-out infinite alternate`,
                    animationDelay: `${delay}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div class="text-center w-full">
          <p class="text-(--text-primary) font-semibold text-[1rem] truncate">
            {nameWithoutExtension}
          </p>
          <p class="text-(--text-muted) text-[0.75rem] mt-0.5">{filename}</p>
        </div>

        <div class="w-full flex flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            step={0.1}
            class="w-full cursor-pointer"
            style={{ accentColor: "var(--accent, #6366f1)" }}
            onInput={(event) => {
              const time = parseFloat((event.target as HTMLInputElement).value);
              if (audioRef.current) audioRef.current.currentTime = time;
            }}
          />
          <div class="flex justify-between text-[0.7rem] text-(--text-muted) tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div class="flex items-center gap-5">
          <button
            type="button"
            class="bg-transparent border-none text-(--text-muted) hover:text-(--text-primary) cursor-pointer p-1 transition-colors"
            onClick={() => skip(-15)}
            title="Back 15s"
          >
            <Icon name="rotate-ccw" size={18} />
          </button>
          <button
            type="button"
            class="w-14 h-14 rounded-full flex items-center justify-center text-(--accent) cursor-pointer transition-all hover:scale-105"
            style={{ background: "rgba(var(--accent-rgb,139,92,246),0.15)" }}
            onClick={togglePlay}
          >
            <Icon name={playing ? "pause" : "play"} size={22} />
          </button>
          <button
            type="button"
            class="bg-transparent border-none text-(--text-muted) hover:text-(--text-primary) cursor-pointer p-1 transition-colors"
            onClick={() => skip(15)}
            title="Forward 15s"
          >
            <Icon name="rotate-cw" size={18} />
          </button>
        </div>

        <div class="flex items-center gap-2 w-full">
          <Icon
            name={volume === 0
              ? "volume-x"
              : volume < 0.5
              ? "volume-1"
              : "volume-2"}
            size={14}
            class="text-(--text-muted) shrink-0"
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            class="flex-1 cursor-pointer"
            style={{ accentColor: "var(--accent, #6366f1)" }}
            onInput={(event) => {
              const newVolume = parseFloat(
                (event.target as HTMLInputElement).value,
              );
              if (audioRef.current) audioRef.current.volume = newVolume;
            }}
          />
        </div>
      </div>

      <style>
        {`
        @keyframes audioBeat {
          from { height: 4px; }
          to { height: 20px; }
        }
      `}
      </style>
    </Modal>
  );
}

function VideoPlayer(
  { filePath, onClose }: { filePath: string; onClose: () => void },
) {
  const filename = filePath.split("/").pop() ?? filePath;
  return (
    <Modal
      title={filename}
      icon="film"
      onClose={onClose}
      class="max-w-[90vw]! w-225!"
    >
      <div style={{ background: "#000", lineHeight: 0 }}>
        <video
          src={streamUrl(filePath)}
          controls
          autoPlay
          class="w-full"
          style={{ maxHeight: "70vh", display: "block" }}
        />
      </div>
    </Modal>
  );
}

function UploadModal(
  { destinationPath, customCategories, onClose, onDone }: {
    destinationPath: string;
    customCategories: string[];
    onClose: () => void;
    onDone: () => void;
  },
) {
  const [uploadFiles, setUploadFiles] = useState<UploadFileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<
    Record<string, "pending" | "done" | "error">
  >({});
  const { addToast } = useToast();

  const addFiles = (fileList: FileList) => {
    setUploadFiles((previous) => [
      ...previous,
      ...Array.from(fileList).map((file) => ({
        file,
        fileType: guessFileType(file.name),
        usage: "other",
      })),
    ]);
  };

  const upload = async () => {
    if (!uploadFiles.length) return;
    setUploading(true);
    setProgress(
      Object.fromEntries(
        uploadFiles.map((item) => [item.file.name, "pending"]),
      ),
    );
    for (const uploadItem of uploadFiles) {
      const formData = new FormData();
      formData.append("file", uploadItem.file);
      formData.append("path", destinationPath);
      formData.append("fileType", uploadItem.fileType);
      formData.append("usage", uploadItem.usage);
      try {
        const response = await fetch("/api/fs/upload", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        setProgress((previous) => ({
          ...previous,
          [uploadItem.file.name]: result.success ? "done" : "error",
        }));
        if (!result.success) {
          addToast(`Failed: ${uploadItem.file.name}`, "error");
        }
      } catch {
        setProgress((previous) => ({
          ...previous,
          [uploadItem.file.name]: "error",
        }));
      }
    }
    setUploading(false);
    addToast(`Uploaded ${uploadFiles.length} file(s)`, "success");
    onDone();
  };

  const allUsageOptions = [
    ...BUILTIN_CATEGORIES.filter((category) =>
      category.value !== "all" && category.value !== "system"
    ),
    ...customCategories.map((name) => ({ value: name, label: name })),
  ];

  return (
    <Modal
      title="Upload Files"
      icon="upload"
      onClose={onClose}
      class="max-w-140!"
    >
      <div
        class="p-6 flex flex-col gap-4"
        style={{ maxHeight: "70vh", overflowY: "auto" }}
      >
        <DropArea onFiles={addFiles} />
        {uploadFiles.length > 0 && (
          <div class="flex flex-col gap-2">
            {uploadFiles.map((uploadItem, index) => {
              const status = progress[uploadItem.file.name];
              return (
                <div
                  key={index}
                  class="flex items-center gap-3 rounded-lg px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <Icon
                    name={typeIcon(uploadItem.fileType)}
                    size={15}
                    class="text-(--accent) shrink-0"
                  />
                  <span
                    class="flex-1 min-w-0 truncate text-[0.82rem] font-mono text-(--text-secondary)"
                    title={uploadItem.file.name}
                  >
                    {uploadItem.file.name}
                  </span>
                  <span class="text-[0.72rem] text-(--text-muted) shrink-0">
                    {formatSize(uploadItem.file.size)}
                  </span>
                  <select
                    class="text-[0.78rem] bg-(--bg-card) rounded-md px-2 py-1 text-(--text-primary) cursor-pointer"
                    value={uploadItem.fileType}
                    onChange={(event) =>
                      setUploadFiles((previous) =>
                        previous.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                              ...item,
                              fileType:
                                (event.target as HTMLSelectElement).value,
                            }
                            : item
                        )
                      )}
                    disabled={uploading}
                  >
                    {FILE_TYPES.map((fileType) => (
                      <option key={fileType} value={fileType}>
                        {fileType}
                      </option>
                    ))}
                  </select>
                  <select
                    class="text-[0.78rem] bg-(--bg-card) rounded-md px-2 py-1 text-(--text-primary) cursor-pointer"
                    value={uploadItem.usage}
                    onChange={(event) =>
                      setUploadFiles((previous) =>
                        previous.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                              ...item,
                              usage: (event.target as HTMLSelectElement).value,
                            }
                            : item
                        )
                      )}
                    disabled={uploading}
                  >
                    {allUsageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {status === "done"
                    ? (
                      <Icon
                        name="check-circle"
                        size={14}
                        class="text-success shrink-0"
                      />
                    )
                    : status === "error"
                    ? (
                      <Icon
                        name="x-circle"
                        size={14}
                        class="text-danger shrink-0"
                      />
                    )
                    : status === "pending"
                    ? (
                      <Icon
                        name="loader"
                        size={13}
                        class="animate-spin text-(--accent) shrink-0"
                      />
                    )
                    : (
                      <button
                        type="button"
                        class="bg-transparent border-none text-(--text-muted) hover:text-danger cursor-pointer p-0 leading-none"
                        onClick={() =>
                          setUploadFiles((previous) =>
                            previous.filter((_, itemIndex) =>
                              itemIndex !== index
                            )
                          )}
                      >
                        <Icon name="x" size={13} />
                      </button>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div class="p-4 flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-[0.82rem] font-semibold text-(--text-secondary) bg-transparent cursor-pointer hover:text-(--text-primary) transition-all disabled:opacity-50"
          onClick={onClose}
          disabled={uploading}
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[0.82rem] font-semibold text-(--accent) bg-(--accent-dim) hover:bg-(--accent) hover:text-white cursor-pointer transition-all disabled:opacity-50"
          onClick={upload}
          disabled={uploading || !uploadFiles.length}
        >
          <Icon name="upload" size={13} />
          {uploading
            ? "Uploading…"
            : `Upload ${uploadFiles.length} File${
              uploadFiles.length !== 1 ? "s" : ""
            }`}
        </button>
      </div>
    </Modal>
  );
}

function FileViewer(
  { filePath, onClose }: { filePath: string; onClose: () => void },
) {
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filename = filePath.split("/").pop() ?? filePath;

  useEffect(() => {
    fetch(`/api/fs/read?path=${encodeURIComponent(filePath)}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setContent(data.content);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
  }, [filePath]);

  const save = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const response = await fetch("/api/fs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: filePath,
          content: editorRef.current.getValue(),
        }),
      });
      const result = await response.json();
      setSaveMessage(result.success ? "Saved" : (result.error ?? "Failed"));
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage("Failed");
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
            {saveMessage && (
              <span
                class={`text-[0.75rem] ${
                  saveMessage === "Saved" ? "text-success" : "text-danger"
                }`}
              >
                {saveMessage}
              </span>
            )}
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold text-(--accent) bg-(--accent-dim) hover:bg-(--accent) hover:text-white cursor-pointer transition-all disabled:opacity-50"
              onClick={save}
              disabled={saving || loading || !!error}
            >
              <Icon name="save" size={13} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <div class="flex-1 min-h-0 relative">
          {loading && (
            <div class="absolute inset-0 flex items-center justify-center text-(--text-muted) text-sm gap-2 bg-(--bg-card)">
              <Icon name="loader" size={14} class="animate-spin" /> Loading…
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
              onMount={(editor) => {
                editorRef.current = editor;
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  size: "Size",
  modified: "Date",
  type: "Type",
};

export function FileBrowserPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [metadata, setMetadata] = useState<Record<string, FileMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAscending, setSortAscending] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("axiom-file-view-mode");
    return (saved === "icons" || saved === "list") ? saved : "list";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [viewingFilePath, setViewingFilePath] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<"text" | "video" | "audio" | null>(
    null,
  );
  const [editingPath, setEditingPath] = useState(false);
  const [pathInputValue, setPathInputValue] = useState("");
  const pathInputRef = useRef<HTMLInputElement>(null);

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("axiom-file-categories") ?? "[]");
    } catch {
      return [];
    }
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [_draggingFilePath, setDraggingFilePath] = useState<string | null>(
    null,
  );

  const { addToast } = useToast();

  const navigate = (targetPath: string) => {
    setLoading(true);
    setError(null);
    setSearchQuery("");
    fetch(`/api/fs/list?path=${encodeURIComponent(targetPath)}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          addToast(data.error, "error");
        } else {
          setCurrentPath(data.path);
          setEntries(data.entries);
          setPathInputValue(data.path);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to list directory");
        setLoading(false);
      });
  };

  const loadMetadata = () => {
    fetch("/api/fs/metadata")
      .then((response) => response.json())
      .then((data) => setMetadata(data))
      .catch(() => {});
  };

  useEffect(() => {
    navigate("");
    loadMetadata();
  }, []);

  const goUp = () => {
    if (!currentPath || currentPath === "/") return;
    navigate(currentPath.split("/").slice(0, -1).join("/") || "/");
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAscending((previous) => !previous);
    else {
      setSortKey(key);
      setSortAscending(true);
    }
  };

  const getFullPath = (name: string) =>
    currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;

  const openFile = (filePath: string, name: string) => {
    setViewingFilePath(filePath);
    if (isVideoFile(name)) setMediaMode("video");
    else if (isAudioFile(name)) setMediaMode("audio");
    else setMediaMode("text");
  };

  const closeMedia = () => {
    setViewingFilePath(null);
    setMediaMode(null);
  };

  const saveCustomCategories = (updated: string[]) => {
    setCustomCategories(updated);
    localStorage.setItem("axiom-file-categories", JSON.stringify(updated));
  };

  const commitNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !customCategories.includes(trimmed)) {
      saveCustomCategories([...customCategories, trimmed]);
    }
    setNewCategoryName("");
    setAddingCategory(false);
  };

  const deleteCustomCategory = (name: string) => {
    saveCustomCategories(
      customCategories.filter((category) => category !== name),
    );
    if (activeCategory === name) setActiveCategory("all");
  };

  const assignCategoryToFile = async (filePath: string, usage: string) => {
    const existing = metadata[filePath];
    const updated: FileMeta = {
      fileType: existing?.fileType ??
        guessFileType(filePath.split("/").pop() ?? ""),
      usage,
      uploadedAt: existing?.uploadedAt ?? Date.now(),
    };
    try {
      await fetch("/api/fs/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, ...updated }),
      });
      setMetadata((previous) => ({ ...previous, [filePath]: updated }));
      addToast(`Assigned to ${usage}`, "success");
    } catch {
      addToast("Failed to assign category", "error");
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (index: number) => setDragOverIndex(index);
  const handleDrop = () => {
    if (
      dragIndex === null || dragOverIndex === null ||
      dragIndex === dragOverIndex
    ) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...customCategories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, moved);
    saveCustomCategories(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const startPathEdit = () => {
    setPathInputValue(currentPath);
    setEditingPath(true);
    requestAnimationFrame(() => pathInputRef.current?.select());
  };

  const commitPathEdit = () => {
    setEditingPath(false);
    if (pathInputValue && pathInputValue !== currentPath) {
      navigate(pathInputValue);
    }
  };

  const filtered = entries.filter((entry) => {
    const isDotfile = entry.name.startsWith(".");
    if (searchQuery) {
      return entry.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (activeCategory === "all") return true;
    if (activeCategory === "system") return isDotfile;
    if (entry.isDir || isDotfile) return false;
    const fileMeta = metadata[getFullPath(entry.name)];
    if (!fileMeta) return activeCategory === "other";
    return fileMeta.usage === activeCategory;
  });

  const sorted = [...filtered].sort((entryA, entryB) => {
    if (entryA.isDir !== entryB.isDir) return entryA.isDir ? -1 : 1;
    let comparison = 0;
    switch (sortKey) {
      case "name":
        comparison = entryA.name.localeCompare(entryB.name);
        break;
      case "size":
        comparison = entryA.size - entryB.size;
        break;
      case "modified":
        comparison = entryA.modified - entryB.modified;
        break;
      case "type":
        comparison = guessFileType(entryA.name).localeCompare(
          guessFileType(entryB.name),
        );
        break;
    }
    return sortAscending ? comparison : -comparison;
  });

  const pathParts = (!currentPath || currentPath === "/")
    ? [""]
    : currentPath.split("/");

  const rowHover = (element: HTMLElement, isDir: boolean) => {
    element.style.background = isDir
      ? "rgba(var(--accent-rgb,139,92,246),0.06)"
      : "rgba(255,255,255,0.04)";
  };

  return (
    <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
      <header
        class="mb-10 opacity-0 flex items-center justify-between"
        style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 flex items-center justify-center text-(--accent) rounded-lg">
            <Icon name="hard-drive" size={24} />
          </div>
          <div>
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-(--text-primary) leading-none mb-1">
              Files
            </h1>
            <p class="text-[0.7rem] text-(--text-muted) tracking-widest uppercase">
              Browse and manage files
            </p>
          </div>
        </div>
      </header>

      <div class="flex gap-6">
        <div class="w-44 shrink-0 flex flex-col gap-0.5">
          {BUILTIN_CATEGORIES.map((category) => (
            <SidebarBtn
              key={category.value}
              icon={category.icon}
              label={category.label}
              active={activeCategory === category.value}
              onClick={() => setActiveCategory(category.value)}
              onFileDrop={category.value !== "all" &&
                  category.value !== "system"
                ? (filePath) => assignCategoryToFile(filePath, category.value)
                : undefined}
            />
          ))}

          <div class="mt-3 pt-3">
            <p class="text-[0.68rem] text-(--text-muted) uppercase tracking-wider px-3 mb-1 font-semibold">
              Custom
            </p>

            {customCategories.map((name, index) => (
              <div
                key={name}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  handleDragOver(index);
                }}
                onDrop={handleDrop}
                style={{
                  opacity: dragIndex === index ? 0.4 : 1,
                  borderTop: dragOverIndex === index && dragIndex !== index
                    ? "2px solid var(--accent, #6366f1)"
                    : "2px solid transparent",
                  transition: "opacity 0.15s, border-color 0.15s",
                }}
              >
                <SidebarBtn
                  icon="tag"
                  label={name}
                  active={activeCategory === name}
                  onClick={() => setActiveCategory(name)}
                  onDelete={() => deleteCustomCategory(name)}
                  onFileDrop={(filePath) =>
                    assignCategoryToFile(filePath, name)}
                />
              </div>
            ))}

            {addingCategory
              ? (
                <div class="flex items-center gap-1 px-2 py-1.5">
                  <Icon
                    name="tag"
                    size={13}
                    class="text-(--text-muted) shrink-0"
                  />
                  <input
                    ref={newCategoryInputRef}
                    class="flex-1 bg-transparent border-none outline-none text-[0.83rem] text-(--text-primary) min-w-0"
                    placeholder="Category name…"
                    value={newCategoryName}
                    onInput={(event) =>
                      setNewCategoryName(
                        (event.target as HTMLInputElement).value,
                      )}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitNewCategory();
                      if (event.key === "Escape") {
                        setAddingCategory(false);
                        setNewCategoryName("");
                      }
                    }}
                    onBlur={commitNewCategory}
                    autoFocus
                  />
                </div>
              )
              : (
                <button
                  type="button"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.83rem] border-none cursor-pointer transition-all text-left w-full bg-transparent text-(--text-muted) hover:text-(--accent)"
                  onClick={() => {
                    setAddingCategory(true);
                    requestAnimationFrame(() =>
                      newCategoryInputRef.current?.focus()
                    );
                  }}
                >
                  <Icon name="plus" size={14} />
                  Add category
                </button>
              )}
          </div>

          <div class="mt-3 pt-3">
            <p class="text-[0.68rem] text-(--text-muted) uppercase tracking-wider px-3 mb-1 font-semibold">
              Jump to
            </p>
            {[{ label: "Home", path: "", icon: "home" }, {
              label: "Root",
              path: "/",
              icon: "server",
            }].map((jumpTarget) => (
              <SidebarBtn
                key={jumpTarget.label}
                icon={jumpTarget.icon}
                label={jumpTarget.label}
                active={false}
                onClick={() => navigate(jumpTarget.path)}
              />
            ))}
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex-1 min-w-0 flex items-center gap-1 rounded-lg px-3 py-1.5 overflow-hidden backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Icon
                name="folder"
                size={12}
                class="text-(--text-muted) shrink-0"
              />
              {editingPath
                ? (
                  <input
                    ref={pathInputRef}
                    class="flex-1 bg-transparent border-none outline-none text-[0.78rem] font-mono text-(--text-primary) min-w-0"
                    value={pathInputValue}
                    onInput={(event) =>
                      setPathInputValue(
                        (event.target as HTMLInputElement).value,
                      )}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitPathEdit();
                      if (event.key === "Escape") setEditingPath(false);
                    }}
                    onBlur={commitPathEdit}
                  />
                )
                : (
                  <div
                    class="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto cursor-text"
                    onClick={startPathEdit}
                  >
                    {pathParts.map((part, index) => {
                      const crumbPath = index === 0
                        ? "/"
                        : pathParts.slice(0, index + 1).join("/");
                      return (
                        <span
                          key={index}
                          class="flex items-center gap-0.5 shrink-0"
                        >
                          {index > 0 && (
                            <span class="text-(--text-muted) text-xs select-none">
                              /
                            </span>
                          )}
                          <button
                            type="button"
                            class="text-[0.78rem] text-(--accent) hover:text-(--text-primary) bg-transparent border-none cursor-pointer px-0.5 py-0 transition-colors whitespace-nowrap font-mono"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(crumbPath);
                            }}
                          >
                            {part || "~"}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              <button
                type="button"
                class="bg-transparent border-none text-(--text-muted) hover:text-(--accent) cursor-pointer p-0 leading-none shrink-0 ml-1"
                onClick={startPathEdit}
              >
                <Icon name="pencil" size={11} />
              </button>
            </div>

            <div
              class="flex items-center rounded-lg px-2 py-1.5 gap-1 backdrop-blur-sm shrink-0"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Icon name="search" size={13} class="text-(--text-muted)" />
              <input
                class="bg-transparent border-none outline-none text-[0.78rem] text-(--text-primary) w-32"
                placeholder="Search…"
                value={searchQuery}
                onInput={(event) =>
                  setSearchQuery((event.target as HTMLInputElement).value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  class="bg-transparent border-none text-(--text-muted) hover:text-(--text-primary) cursor-pointer p-0 leading-none"
                  onClick={() => setSearchQuery("")}
                >
                  <Icon name="x" size={11} />
                </button>
              )}
            </div>

            <div
              class="flex items-center gap-0 rounded-lg px-1 py-0.5 shrink-0 backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              {(["name", "size", "modified", "type"] as SortKey[]).map((
                key,
              ) => (
                <SortBtn
                  key={key}
                  label={SORT_LABELS[key]}
                  sortKey={key}
                  active={sortKey === key}
                  ascending={sortAscending}
                  onSort={handleSort}
                />
              ))}
            </div>

            <div
              class="flex items-center rounded-lg overflow-hidden shrink-0 backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              {(["list", "icons"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  class={`px-2.5 py-1.5 border-none cursor-pointer transition-all ${
                    viewMode === mode
                      ? "text-(--accent)"
                      : "bg-transparent text-(--text-muted) hover:text-(--text-secondary)"
                  }`}
                  style={viewMode === mode
                    ? { background: "rgba(var(--accent-rgb,139,92,246),0.12)" }
                    : undefined}
                  onClick={() => {
                    setViewMode(mode);
                    localStorage.setItem("axiom-file-view-mode", mode);
                  }}
                >
                  <Icon
                    name={mode === "list" ? "list" : "grid-2x2"}
                    size={14}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[0.82rem] font-semibold text-(--accent) bg-(--accent-dim) hover:bg-(--accent) hover:text-white cursor-pointer transition-all shrink-0"
              onClick={() => setShowUpload(true)}
            >
              <Icon name="upload" size={14} />
              Upload
            </button>
          </div>

          <div
            class="rounded-xl overflow-hidden backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            {viewMode === "list" && (
              <div
                class="grid items-center px-4 py-2"
                style={{
                  gridTemplateColumns: "28px 1fr 80px 96px 88px 80px",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div />
                <span class="text-[0.7rem] text-(--text-muted) uppercase tracking-wider font-semibold">
                  Name
                </span>
                <span class="text-[0.7rem] text-(--text-muted) uppercase tracking-wider font-semibold text-center">
                  Type
                </span>
                <span class="text-[0.7rem] text-(--text-muted) uppercase tracking-wider font-semibold text-center">
                  Usage
                </span>
                <span class="text-[0.7rem] text-(--text-muted) uppercase tracking-wider font-semibold text-right">
                  Modified
                </span>
                <span class="text-[0.7rem] text-(--text-muted) uppercase tracking-wider font-semibold text-right">
                  Size
                </span>
              </div>
            )}

            <div
              style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}
            >
              {loading && (
                <div class="flex items-center justify-center py-16 text-(--text-muted) gap-2 text-sm">
                  <Icon name="loader" size={16} class="animate-spin" /> Loading…
                </div>
              )}
              {!loading && error && (
                <div class="flex flex-col items-center justify-center py-16 gap-2">
                  <Icon name="alert-circle" size={20} class="text-danger" />
                  <span class="text-[0.85rem] text-danger">{error}</span>
                </div>
              )}

              {!loading && !error && viewMode === "list" && (
                <>
                  {currentPath && currentPath !== "/" && (
                    <div
                      class="grid items-center px-4 py-2.5 cursor-pointer transition-all duration-150"
                      style={{
                        gridTemplateColumns: "28px 1fr 80px 96px 88px 80px",
                      }}
                      onMouseEnter={(event) =>
                        rowHover(event.currentTarget as HTMLElement, true)}
                      onMouseLeave={(event) => {
                        (event.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                      onClick={goUp}
                    >
                      <Icon
                        name="arrow-left"
                        size={13}
                        class="text-(--text-muted)"
                      />
                      <span class="text-[0.82rem] text-(--text-muted) font-mono">
                        ..
                      </span>
                      <div />
                      <div />
                      <div />
                      <div />
                    </div>
                  )}
                  {sorted.length === 0 && (
                    <div class="py-16 text-center text-[0.82rem] text-(--text-muted)">
                      {searchQuery
                        ? `No files matching "${searchQuery}"`
                        : activeCategory !== "all"
                        ? "No files in this category"
                        : "Empty directory"}
                    </div>
                  )}
                  {sorted.map((entry) => {
                    const fullPath = getFullPath(entry.name);
                    const fileMeta = metadata[fullPath];
                    const fileType = entry.isDir
                      ? ""
                      : (fileMeta?.fileType ?? guessFileType(entry.name));
                    const usage = fileMeta?.usage ?? "";
                    const isDotfile = entry.name.startsWith(".");
                    const isMedia = isVideoFile(entry.name) ||
                      isAudioFile(entry.name);
                    const openable = !entry.isDir &&
                      (canOpenInMonaco(entry.name) || isMedia);

                    return (
                      <div
                        key={entry.name}
                        class={`grid items-center px-4 py-2.5 transition-all duration-150 ${
                          openable || entry.isDir
                            ? "cursor-pointer"
                            : "cursor-default"
                        }`}
                        style={{
                          gridTemplateColumns: "28px 1fr 80px 96px 88px 80px",
                        }}
                        draggable={!entry.isDir}
                        onDragStart={(event) => {
                          if (!entry.isDir) {
                            event.dataTransfer?.setData("text/plain", fullPath);
                            setDraggingFilePath(fullPath);
                          }
                        }}
                        onDragEnd={() => setDraggingFilePath(null)}
                        onMouseEnter={(event) => {
                          if (openable || entry.isDir) {
                            rowHover(
                              event.currentTarget as HTMLElement,
                              entry.isDir,
                            );
                          }
                        }}
                        onMouseLeave={(event) => {
                          (event.currentTarget as HTMLElement).style
                            .background = "transparent";
                        }}
                        onClick={() => {
                          if (entry.isDir) navigate(fullPath);
                          else if (openable) openFile(fullPath, entry.name);
                        }}
                      >
                        <Icon
                          name={entry.isDir
                            ? "folder"
                            : (isDotfile ? "shield" : typeIcon(fileType))}
                          size={14}
                          class={entry.isDir
                            ? "text-(--accent)"
                            : isDotfile
                            ? "text-(--accent)"
                            : "text-(--text-muted)"}
                        />
                        <span
                          class={`truncate text-[0.82rem] font-mono pr-4 ${
                            entry.isDir
                              ? "text-(--text-primary) font-medium"
                              : isDotfile
                              ? "text-(--accent)"
                              : "text-(--text-secondary)"
                          }`}
                          title={entry.name}
                        >
                          {entry.name}
                        </span>
                        <div class="flex justify-center">
                          {!entry.isDir && (
                            <span
                              class={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded uppercase ${
                                typeBadgeColor(fileType)
                              }`}
                            >
                              {fileType}
                            </span>
                          )}
                        </div>
                        <div class="flex justify-center">
                          {usage && !entry.isDir && (
                            <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded uppercase bg-(--accent-dim) text-(--accent)">
                              {usage}
                            </span>
                          )}
                        </div>
                        <span class="text-[0.72rem] text-(--text-muted) tabular-nums text-right">
                          {entry.modified ? formatDate(entry.modified) : "—"}
                        </span>
                        <span class="text-[0.72rem] text-(--text-muted) tabular-nums text-right">
                          {entry.isDir ? "" : formatSize(entry.size)}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              {!loading && !error && viewMode === "icons" && (
                <div
                  class="p-4 grid gap-3"
                  style={{
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(120px, 1fr))",
                  }}
                >
                  {currentPath && currentPath !== "/" && (
                    <div
                      class="flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-150"
                      style={{
                        "--hover-bg": "rgba(255,255,255,0.04)",
                      } as Record<string, string>}
                      onMouseEnter={(event) => {
                        (event.currentTarget as HTMLElement).style.background =
                          "rgba(var(--accent-rgb,139,92,246),0.06)";
                      }}
                      onMouseLeave={(event) => {
                        (event.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                      onClick={goUp}
                    >
                      <div
                        class="w-14 h-14 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <Icon
                          name="arrow-left"
                          size={24}
                          class="text-(--text-muted)"
                        />
                      </div>
                      <span class="text-[0.72rem] text-(--text-muted) font-mono text-center truncate w-full">
                        ..
                      </span>
                    </div>
                  )}
                  {sorted.map((entry) => {
                    const fullPath = getFullPath(entry.name);
                    const fileMeta = metadata[fullPath];
                    const fileType = entry.isDir
                      ? ""
                      : (fileMeta?.fileType ?? guessFileType(entry.name));
                    const isDotfile = entry.name.startsWith(".");
                    const isMedia = isVideoFile(entry.name) ||
                      isAudioFile(entry.name);
                    const openable = !entry.isDir &&
                      (canOpenInMonaco(entry.name) || isMedia);

                    return (
                      <div
                        key={entry.name}
                        class={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150 ${
                          openable || entry.isDir
                            ? "cursor-pointer"
                            : "cursor-default"
                        }`}
                        draggable={!entry.isDir}
                        onDragStart={(event) => {
                          if (!entry.isDir) {
                            event.dataTransfer?.setData("text/plain", fullPath);
                            setDraggingFilePath(fullPath);
                          }
                        }}
                        onDragEnd={() => setDraggingFilePath(null)}
                        onMouseEnter={(event) => {
                          if (openable || entry.isDir) {
                            (event.currentTarget as HTMLElement).style
                              .background = entry.isDir
                                ? "rgba(var(--accent-rgb,139,92,246),0.06)"
                                : "rgba(255,255,255,0.04)";
                          }
                        }}
                        onMouseLeave={(event) => {
                          (event.currentTarget as HTMLElement).style
                            .background = "transparent";
                        }}
                        onClick={() => {
                          if (entry.isDir) navigate(fullPath);
                          else if (openable) openFile(fullPath, entry.name);
                        }}
                      >
                        <div
                          class="w-14 h-14 flex items-center justify-center rounded-xl"
                          style={{
                            background: entry.isDir
                              ? "rgba(var(--accent-rgb,139,92,246),0.12)"
                              : isDotfile
                              ? "rgba(var(--accent-rgb,139,92,246),0.1)"
                              : "rgba(255,255,255,0.05)",
                          }}
                        >
                          <Icon
                            name={entry.isDir
                              ? "folder"
                              : isDotfile
                              ? "shield"
                              : typeIcon(fileType)}
                            size={28}
                            class={entry.isDir
                              ? "text-(--accent)"
                              : isDotfile
                              ? "text-(--accent)"
                              : "text-(--text-muted)"}
                          />
                        </div>
                        <span
                          class={`text-[0.72rem] font-mono text-center truncate w-full ${
                            entry.isDir
                              ? "text-(--text-primary)"
                              : isDotfile
                              ? "text-(--accent)"
                              : "text-(--text-secondary)"
                          }`}
                          title={entry.name}
                        >
                          {entry.name}
                        </span>
                        {!entry.isDir && (
                          <span
                            class={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded uppercase ${
                              typeBadgeColor(fileType)
                            }`}
                          >
                            {fileType}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showUpload && (
        <UploadModal
          destinationPath={currentPath}
          customCategories={customCategories}
          onClose={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false);
            navigate(currentPath);
            loadMetadata();
          }}
        />
      )}

      {viewingFilePath && mediaMode === "audio" && (
        <AudioPlayer filePath={viewingFilePath} onClose={closeMedia} />
      )}
      {viewingFilePath && mediaMode === "video" && (
        <VideoPlayer filePath={viewingFilePath} onClose={closeMedia} />
      )}
      {viewingFilePath && mediaMode === "text" && (
        <FileViewer filePath={viewingFilePath} onClose={closeMedia} />
      )}
    </div>
  );
}
