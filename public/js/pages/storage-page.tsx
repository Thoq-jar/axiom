import { useEffect, useState } from "preact/hooks";
import { Icon } from "../components/ui/icon.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { Button } from "../components/ui/button.tsx";
import { useToast } from "../hooks/use-toast.ts";

interface AttachedDisk {
  deviceIdentifier: string;
  devicePath: string;
  displayName: string;
  size: number;
  model: string;
  diskType: "internal" | "external" | "virtual" | "unknown";
  mountPoint: string | null;
  isRemovable: boolean;
}

interface StoragePool {
  poolId: string;
  poolName: string;
  poolColor: string;
  assignedDiskPaths: string[];
  dataCategories: string[];
  description: string;
}

const SUGGESTED_CATEGORIES = [
  "Media",
  "Backups",
  "Documents",
  "Projects",
  "Games",
  "Archives",
  "System",
  "Downloads",
  "Photos",
  "Videos",
  "Music",
  "Databases",
];

const POOL_COLOR_OPTIONS = [
  { label: "Violet", value: "#8b5cf6" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Femboy", value: "#ec4899" },
];

function formatDiskSizeForDisplay(sizeInBytes: number): string {
  if (sizeInBytes >= 1_000_000_000_000) {
    return `${(sizeInBytes / 1_000_000_000_000).toFixed(1)} TB`;
  }
  if (sizeInBytes >= 1_000_000_000) {
    return `${(sizeInBytes / 1_000_000_000).toFixed(1)} GB`;
  }
  if (sizeInBytes >= 1_000_000) {
    return `${(sizeInBytes / 1_000_000).toFixed(1)} MB`;
  }
  return `${sizeInBytes} B`;
}

function getDiskTypeIconName(diskType: AttachedDisk["diskType"]): string {
  if (diskType === "internal") return "hard-drive";
  if (diskType === "external") return "usb";
  if (diskType === "virtual") return "layers";
  return "circle-help";
}

function findPoolForDisk(
  diskDevicePath: string,
  storagePools: StoragePool[],
): StoragePool | null {
  return (
    storagePools.find((pool) =>
      pool.assignedDiskPaths.includes(diskDevicePath)
    ) ?? null
  );
}

function DiskCard({
  disk,
  storagePools,
  onAssignToPool,
}: {
  disk: AttachedDisk;
  storagePools: StoragePool[];
  onAssignToPool: (diskDevicePath: string) => void;
}) {
  const assignedPool = findPoolForDisk(disk.devicePath, storagePools);

  return (
    <div
      class="rounded-xl p-5 flex flex-col gap-3 backdrop-blur-sm will-change-transform"
      style={{ background: "var(--ui-bg)" }}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-(--accent-dim) text-(--accent)">
          <Icon name={getDiskTypeIconName(disk.diskType)} size={20} />
        </div>
        <div class="flex-1 min-w-0">
          <p
            class="text-[0.9rem] font-semibold text-(--text-primary) truncate leading-tight"
            title={disk.displayName}
          >
            {disk.displayName || disk.deviceIdentifier}
          </p>
          <p class="text-[0.75rem] text-(--text-muted) mt-0.5">
            {disk.devicePath}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-[0.78rem]">
          <span class="text-(--text-secondary)">Size</span>
          <span class="text-(--text-primary) font-medium">
            {disk.size > 0 ? formatDiskSizeForDisplay(disk.size) : "Unknown"}
          </span>
        </div>
        <div class="flex items-center justify-between text-[0.78rem]">
          <span class="text-(--text-secondary)">Type</span>
          <span class="text-(--text-primary) font-medium capitalize">
            {disk.diskType}
          </span>
        </div>
        {disk.mountPoint && (
          <div class="flex items-center justify-between text-[0.78rem] gap-3">
            <span class="text-(--text-secondary) shrink-0">Mounted at</span>
            <span
              class="text-(--text-primary) font-medium truncate"
              title={disk.mountPoint}
            >
              {disk.mountPoint}
            </span>
          </div>
        )}
      </div>

      {assignedPool
        ? (
          <div
            class="flex items-center gap-2 rounded-lg py-1.5 px-3 text-[0.75rem] font-medium"
            style={{
              background: `${assignedPool.poolColor}15`,
              color: assignedPool.poolColor,
            }}
          >
            <div
              class="w-2 h-2 rounded-full shrink-0"
              style={{ background: assignedPool.poolColor }}
            />
            <span class="truncate">{assignedPool.poolName}</span>
          </div>
        )
        : (
          <Button
            class="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-[0.78rem] font-medium cursor-pointer transition-all duration-200 bg-(--bg-secondary) text-(--text-muted) hover:text-(--accent) hover:bg-(--accent-dim) w-full"
            onClick={() => onAssignToPool(disk.devicePath)}
          >
            <Icon name="plus" size={13} />
            Assign to pool
          </Button>
        )}
    </div>
  );
}

function PoolCard({
  pool,
  detectedDisks,
  onEdit,
  onDelete,
}: {
  pool: StoragePool;
  detectedDisks: AttachedDisk[];
  onEdit: (pool: StoragePool) => void;
  onDelete: (poolId: string) => void;
}) {
  const poolDisks = detectedDisks.filter((disk) =>
    pool.assignedDiskPaths.includes(disk.devicePath)
  );

  const totalPoolSizeInBytes = poolDisks.reduce(
    (accumulator, disk) => accumulator + disk.size,
    0,
  );

  return (
    <div
      class="rounded-xl p-5 flex flex-col gap-4 backdrop-blur-sm will-change-transform"
      style={{ background: "var(--ui-bg)" }}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div
            class="w-3 h-3 rounded-full shrink-0"
            style={{ background: pool.poolColor }}
          />
          <div>
            <h3
              class="text-[1rem] font-semibold text-(--text-primary) leading-tight"
              style={{ color: pool.poolColor }}
            >
              {pool.poolName}
            </h3>
            {pool.description && (
              <p class="text-[0.75rem] text-(--text-muted) mt-0.5">
                {pool.description}
              </p>
            )}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            class="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[0.75rem] font-medium cursor-pointer transition-all duration-200 bg-(--bg-secondary) text-(--text-secondary) hover:text-(--text-primary)"
            onClick={() => onEdit(pool)}
          >
            <Icon name="pencil" size={13} />
            Edit
          </Button>
          <Button
            class="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[0.75rem] font-medium cursor-pointer transition-all duration-200 bg-(--bg-secondary) text-(--danger) hover:bg-[rgba(239,68,68,0.1)]"
            onClick={() => onDelete(pool.poolId)}
          >
            <Icon name="trash-2" size={13} />
          </Button>
        </div>
      </div>

      {pool.dataCategories.length > 0 && (
        <div class="flex flex-wrap gap-1.5">
          {pool.dataCategories.map((category) => (
            <span
              key={category}
              class="py-0.5 px-2.5 rounded-full text-[0.7rem] font-medium"
              style={{
                background: `${pool.poolColor}15`,
                color: pool.poolColor,
              }}
            >
              {category}
            </span>
          ))}
        </div>
      )}

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between text-[0.78rem]">
          <span class="text-(--text-secondary)">
            {poolDisks.length} drive{poolDisks.length !== 1 ? "s" : ""}
          </span>
          {totalPoolSizeInBytes > 0 && (
            <span class="text-(--text-primary) font-medium">
              {formatDiskSizeForDisplay(totalPoolSizeInBytes)} total
            </span>
          )}
        </div>

        {poolDisks.length > 0
          ? (
            <div class="flex flex-col gap-1.5">
              {poolDisks.map((disk) => (
                <div
                  key={disk.devicePath}
                  class="flex items-center gap-2.5 py-2 px-3 rounded-lg text-[0.78rem]"
                  style={{ background: `${pool.poolColor}0a` }}
                >
                  <Icon
                    name={getDiskTypeIconName(disk.diskType)}
                    size={14}
                    class="text-(--text-muted) shrink-0"
                  />
                  <span class="text-(--text-primary) flex-1 truncate">
                    {disk.displayName || disk.deviceIdentifier}
                  </span>
                  <span class="text-(--text-muted) shrink-0">
                    {disk.size > 0
                      ? formatDiskSizeForDisplay(disk.size)
                      : "Unknown"}
                  </span>
                </div>
              ))}
            </div>
          )
          : (
            <p class="text-[0.78rem] text-(--text-muted) italic">
              No drives assigned — edit to add drives.
            </p>
          )}
      </div>
    </div>
  );
}

function PoolEditorModal({
  initialPool,
  detectedDisks,
  allPools,
  onSave,
  onClose,
}: {
  initialPool: StoragePool | null;
  detectedDisks: AttachedDisk[];
  allPools: StoragePool[];
  onSave: (pool: StoragePool) => void;
  onClose: () => void;
}) {
  const [poolName, setPoolName] = useState(initialPool?.poolName ?? "");
  const [poolColor, setPoolColor] = useState(
    initialPool?.poolColor ?? POOL_COLOR_OPTIONS[0].value,
  );
  const [description, setDescription] = useState(
    initialPool?.description ?? "",
  );
  const [assignedDiskPaths, setAssignedDiskPaths] = useState<string[]>(
    initialPool?.assignedDiskPaths ?? [],
  );
  const [dataCategories, setDataCategories] = useState<string[]>(
    initialPool?.dataCategories ?? [],
  );
  const [categoryInputValue, setCategoryInputValue] = useState("");

  const fileBrowserCustomCategories: string[] = (() => {
    try {
      const parsed = JSON.parse(
        localStorage.getItem("axiom-file-categories") ?? "[]",
      );
      return Array.isArray(parsed)
        ? parsed.filter(
          (name: string) => !SUGGESTED_CATEGORIES.includes(name),
        )
        : [];
    } catch {
      return [];
    }
  })();

  const otherPoolAssignedPaths = allPools
    .filter(
      (pool) => !initialPool || pool.poolId !== initialPool.poolId,
    )
    .flatMap((pool) => pool.assignedDiskPaths);

  function toggleDiskAssignment(diskDevicePath: string) {
    setAssignedDiskPaths((previousPaths) =>
      previousPaths.includes(diskDevicePath)
        ? previousPaths.filter((path) => path !== diskDevicePath)
        : [...previousPaths, diskDevicePath]
    );
  }

  function toggleCategory(categoryName: string) {
    setDataCategories((previousCategories) =>
      previousCategories.includes(categoryName)
        ? previousCategories.filter((category) => category !== categoryName)
        : [...previousCategories, categoryName]
    );
  }

  function addCustomCategory() {
    const trimmedInput = categoryInputValue.trim();
    if (!trimmedInput || dataCategories.includes(trimmedInput)) {
      setCategoryInputValue("");
      return;
    }
    setDataCategories((previousCategories) => [
      ...previousCategories,
      trimmedInput,
    ]);
    setCategoryInputValue("");
  }

  function handleSave() {
    if (!poolName.trim()) return;
    onSave({
      poolId: initialPool?.poolId ?? crypto.randomUUID(),
      poolName: poolName.trim(),
      poolColor,
      assignedDiskPaths,
      dataCategories,
      description: description.trim(),
    });
  }

  return (
    <Modal
      title={initialPool ? "Edit Pool" : "New Storage Pool"}
      icon="layers"
      onClose={onClose}
      class="w-130! max-w-[95vw]!"
    >
      <div class="flex flex-col gap-5 p-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-[0.78rem] font-medium text-(--text-secondary) uppercase tracking-wider">
            Pool Name
          </label>
          <input
            class="w-full bg-(--bg-secondary) border border-(--ui-border) rounded-lg py-2.5 px-3.5 text-(--text-primary) font-[inherit] text-[0.85rem] outline-none transition-[border-color] duration-200 focus:border-(--accent) placeholder:text-(--text-muted)"
            type="text"
            placeholder="e.g. Media Storage, Backup Vault"
            value={poolName}
            onInput={(event) =>
              setPoolName((event.target as HTMLInputElement).value)}
            autoFocus
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[0.78rem] font-medium text-(--text-secondary) uppercase tracking-wider">
            Description (optional)
          </label>
          <input
            class="w-full bg-(--bg-secondary) border border-(--ui-border) rounded-lg py-2.5 px-3.5 text-(--text-primary) font-[inherit] text-[0.85rem] outline-none transition-[border-color] duration-200 focus:border-(--accent) placeholder:text-(--text-muted)"
            type="text"
            placeholder="What is this pool for?"
            value={description}
            onInput={(event) =>
              setDescription((event.target as HTMLInputElement).value)}
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-[0.78rem] font-medium text-(--text-secondary) uppercase tracking-wider">
            Color
          </label>
          <div class="grid grid-cols-8 gap-3">
            {POOL_COLOR_OPTIONS.map((colorOption) => (
              <button
                key={colorOption.value}
                type="button"
                class="w-9 h-9 rounded-full cursor-pointer transition-all duration-200 font-[inherit]"
                style={{
                  background: colorOption.value,
                  outline: poolColor === colorOption.value
                    ? `2px solid ${colorOption.value}`
                    : "2px solid transparent",
                  outlineOffset: "3px",
                  transform: poolColor === colorOption.value
                    ? "scale(1.15)"
                    : "scale(1)",
                }}
                title={colorOption.label}
                onClick={() => setPoolColor(colorOption.value)}
              />
            ))}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-[0.78rem] font-medium text-(--text-secondary) uppercase tracking-wider">
            Assign Drives ({assignedDiskPaths.length} selected)
          </label>
          {detectedDisks.length === 0
            ? (
              <p class="text-[0.8rem] text-(--text-muted) italic">
                No drives detected. Scan drives first.
              </p>
            )
            : (
              <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {detectedDisks.map((disk) => {
                  const isAssignedToThisPool = assignedDiskPaths.includes(
                    disk.devicePath,
                  );
                  const isAssignedElsewhere = otherPoolAssignedPaths.includes(
                    disk.devicePath,
                  );

                  return (
                    <button
                      key={disk.devicePath}
                      type="button"
                      disabled={isAssignedElsewhere}
                      class="flex items-center gap-3 py-2.5 px-3 rounded-lg text-[0.82rem] cursor-pointer font-[inherit] transition-all duration-200 text-left"
                      style={{
                        background: isAssignedToThisPool
                          ? `${poolColor}15`
                          : "var(--bg-secondary)",
                        border: isAssignedToThisPool
                          ? `1px solid ${poolColor}40`
                          : "1px solid transparent",
                        opacity: isAssignedElsewhere ? 0.4 : 1,
                        cursor: isAssignedElsewhere ? "not-allowed" : "pointer",
                      }}
                      onClick={() =>
                        !isAssignedElsewhere &&
                        toggleDiskAssignment(disk.devicePath)}
                    >
                      <div
                        class="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                        style={{
                          background: isAssignedToThisPool
                            ? poolColor
                            : "var(--bg-card)",
                          border: isAssignedToThisPool
                            ? "none"
                            : "1px solid var(--ui-border)",
                        }}
                      >
                        {isAssignedToThisPool && (
                          <Icon name="check" size={10} class="text-white" />
                        )}
                      </div>
                      <Icon
                        name={getDiskTypeIconName(disk.diskType)}
                        size={14}
                        class="text-(--text-muted) shrink-0"
                      />
                      <div class="flex-1 min-w-0">
                        <span class="text-(--text-primary) truncate block">
                          {disk.displayName || disk.deviceIdentifier}
                        </span>
                        <span class="text-(--text-muted) text-[0.7rem]">
                          {disk.devicePath}
                          {disk.size > 0
                            ? ` · ${formatDiskSizeForDisplay(disk.size)}`
                            : ""}
                          {isAssignedElsewhere ? " · assigned elsewhere" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-[0.78rem] font-medium text-(--text-secondary) uppercase tracking-wider">
            Data Categories
          </label>
          <div class="flex flex-wrap gap-1.5 mb-1">
            {SUGGESTED_CATEGORIES.map((suggestedCategory) => {
              const isSelected = dataCategories.includes(suggestedCategory);
              return (
                <button
                  key={suggestedCategory}
                  type="button"
                  class="py-1 px-2.5 rounded-full text-[0.72rem] font-medium cursor-pointer font-[inherit] transition-all duration-200"
                  style={{
                    background: isSelected
                      ? `${poolColor}20`
                      : "var(--bg-secondary)",
                    color: isSelected ? poolColor : "var(--text-secondary)",
                    border: isSelected
                      ? `1px solid ${poolColor}50`
                      : "1px solid transparent",
                  }}
                  onClick={() => toggleCategory(suggestedCategory)}
                >
                  {suggestedCategory}
                </button>
              );
            })}
          </div>
          {fileBrowserCustomCategories.length > 0 && (
            <div class="flex flex-col gap-1.5 mb-1">
              <span class="text-[0.65rem] text-(--text-muted) uppercase tracking-wider">
                From files
              </span>
              <div class="flex flex-wrap gap-1.5">
                {fileBrowserCustomCategories.map((fileBrowserCategory) => {
                  const isSelected = dataCategories.includes(
                    fileBrowserCategory,
                  );
                  return (
                    <button
                      key={fileBrowserCategory}
                      type="button"
                      class="py-1 px-2.5 rounded-full text-[0.72rem] font-medium cursor-pointer font-[inherit] transition-all duration-200"
                      style={{
                        background: isSelected
                          ? `${poolColor}20`
                          : "var(--bg-secondary)",
                        color: isSelected ? poolColor : "var(--text-secondary)",
                        border: isSelected
                          ? `1px solid ${poolColor}50`
                          : "1px solid transparent",
                      }}
                      onClick={() => toggleCategory(fileBrowserCategory)}
                    >
                      {fileBrowserCategory}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {dataCategories.filter(
                (category) =>
                  !SUGGESTED_CATEGORIES.includes(category) &&
                  !fileBrowserCustomCategories.includes(category),
              ).length > 0 && (
            <div class="flex flex-wrap gap-1.5 mb-1">
              {dataCategories
                .filter(
                  (category) =>
                    !SUGGESTED_CATEGORIES.includes(category) &&
                    !fileBrowserCustomCategories.includes(category),
                )
                .map((customCategory) => (
                  <button
                    key={customCategory}
                    type="button"
                    class="flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[0.72rem] font-medium cursor-pointer font-[inherit] transition-all duration-200"
                    style={{
                      background: `${poolColor}20`,
                      color: poolColor,
                      border: `1px solid ${poolColor}50`,
                    }}
                    onClick={() => toggleCategory(customCategory)}
                  >
                    {customCategory}
                    <Icon name="x" size={10} />
                  </button>
                ))}
            </div>
          )}
          <div class="flex gap-2">
            <input
              class="flex-1 bg-(--bg-secondary) border border-(--ui-border) rounded-lg py-2 px-3 text-(--text-primary) font-[inherit] text-[0.82rem] outline-none transition-[border-color] duration-200 focus:border-(--accent) placeholder:text-(--text-muted)"
              type="text"
              placeholder="Add custom category…"
              value={categoryInputValue}
              onInput={(event) =>
                setCategoryInputValue(
                  (event.target as HTMLInputElement).value,
                )}
              onKeyDown={(event) =>
                event.key === "Enter" && addCustomCategory()}
            />
            <Button
              class="flex items-center gap-1.5 py-2 px-3 rounded-lg text-[0.82rem] font-medium cursor-pointer transition-all duration-200 bg-(--accent-dim) text-(--accent) hover:bg-(--accent) hover:text-white shrink-0"
              onClick={addCustomCategory}
            >
              <Icon name="plus" size={14} />
              Add
            </Button>
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <button
            type="button"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-[10px] text-[0.9rem] font-semibold cursor-pointer font-[inherit] transition-all duration-200 text-white hover:brightness-110"
            style={{ background: poolColor }}
            disabled={!poolName.trim()}
            onClick={handleSave}
          >
            <Icon name="check" size={16} />
            {initialPool ? "Save Changes" : "Create Pool"}
          </button>
          <Button
            class="py-2.5 px-4 rounded-[10px] text-[0.9rem] font-semibold cursor-pointer transition-all duration-200 bg-(--bg-secondary) text-(--text-secondary) hover:text-(--text-primary)"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function StoragePage() {
  const [detectedDisks, setDetectedDisks] = useState<AttachedDisk[]>([]);
  const [storagePools, setStoragePools] = useState<StoragePool[]>([]);
  const [isLoadingDisks, setIsLoadingDisks] = useState(true);
  const [diskScanError, setDiskScanError] = useState<string | null>(null);
  const [isShowingPoolEditor, setIsShowingPoolEditor] = useState(false);
  const [poolBeingEdited, setPoolBeingEdited] = useState<StoragePool | null>(
    null,
  );
  const [preselectedDiskPath, setPreselectedDiskPath] = useState<string | null>(
    null,
  );
  const { addToast } = useToast();

  async function fetchDetectedDisks() {
    setIsLoadingDisks(true);
    setDiskScanError(null);
    try {
      const response = await fetch("/api/disks");
      if (!response.ok) throw new Error("Failed to fetch disks");
      const diskList = (await response.json()) as AttachedDisk[];
      setDetectedDisks(diskList);
    } catch (error) {
      setDiskScanError(String(error));
      addToast("Failed to scan drives", "error");
    } finally {
      setIsLoadingDisks(false);
    }
  }

  async function fetchStoragePools() {
    try {
      const response = await fetch("/api/storage-pools");
      if (!response.ok) throw new Error("Failed to fetch pools");
      const poolList = (await response.json()) as StoragePool[];
      setStoragePools(poolList);
    } catch {
      setStoragePools([]);
    }
  }

  async function persistStoragePools(updatedPools: StoragePool[]) {
    try {
      await fetch("/api/storage-pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPools),
      });
    } catch {
      addToast("Failed to save pools", "error");
    }
  }

  useEffect(() => {
    fetchDetectedDisks();
    fetchStoragePools();
  }, []);

  function handleOpenCreatePool() {
    setPoolBeingEdited(null);
    setPreselectedDiskPath(null);
    setIsShowingPoolEditor(true);
  }

  function handleOpenAssignDisk(diskDevicePath: string) {
    setPoolBeingEdited(null);
    setPreselectedDiskPath(diskDevicePath);
    setIsShowingPoolEditor(true);
  }

  function handleOpenEditPool(pool: StoragePool) {
    setPoolBeingEdited(pool);
    setPreselectedDiskPath(null);
    setIsShowingPoolEditor(true);
  }

  function handleClosePoolEditor() {
    setIsShowingPoolEditor(false);
    setPoolBeingEdited(null);
    setPreselectedDiskPath(null);
  }

  async function handleSavePool(savedPool: StoragePool) {
    let updatedPools: StoragePool[];
    if (poolBeingEdited) {
      updatedPools = storagePools.map((pool) =>
        pool.poolId === savedPool.poolId ? savedPool : pool
      );
    } else {
      updatedPools = [...storagePools, savedPool];
    }
    setStoragePools(updatedPools);
    await persistStoragePools(updatedPools);
    addToast(
      poolBeingEdited ? "Pool updated" : "Pool created",
      "success",
    );
    handleClosePoolEditor();
  }

  async function handleDeletePool(poolId: string) {
    const updatedPools = storagePools.filter((pool) => pool.poolId !== poolId);
    setStoragePools(updatedPools);
    await persistStoragePools(updatedPools);
    addToast("Pool deleted", "success");
  }

  const initialPoolForEditor: StoragePool | null = poolBeingEdited
    ? poolBeingEdited
    : preselectedDiskPath
    ? {
      poolId: "",
      poolName: "",
      poolColor: POOL_COLOR_OPTIONS[0].value,
      assignedDiskPaths: [preselectedDiskPath],
      dataCategories: [],
      description: "",
    }
    : null;

  return (
    <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
      {isShowingPoolEditor && (
        <PoolEditorModal
          initialPool={initialPoolForEditor}
          detectedDisks={detectedDisks}
          allPools={storagePools}
          onSave={handleSavePool}
          onClose={handleClosePoolEditor}
        />
      )}

      <header
        class="mb-10 opacity-0 flex items-center justify-between"
        style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 relative flex items-center justify-center text-(--accent) bg-transparent rounded-lg text-2xl">
            <Icon name="layers" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-(--text-primary) leading-none mb-1">
              Storage
            </h1>
            <p class="text-[0.7rem] text-(--text-muted) tracking-widest uppercase">
              Drives & Pools
            </p>
          </div>
        </div>
        <Button
          class="flex items-center gap-2 py-2 px-4 rounded-lg text-[0.82rem] font-medium cursor-pointer transition-all duration-200 bg-(--accent-dim) text-(--accent) hover:bg-(--accent) hover:text-white"
          onClick={fetchDetectedDisks}
          disabled={isLoadingDisks}
        >
          {isLoadingDisks
            ? (
              <div
                class="w-3.5 h-3.5 border-2 border-(--accent) border-t-transparent rounded-full"
                style={{ animation: "spin 0.7s linear infinite" }}
              />
            )
            : <Icon name="refresh-cw" size={14} />}
          {isLoadingDisks ? "Scanning…" : "Scan Drives"}
        </Button>
      </header>

      <section
        class="mb-10 opacity-0"
        style={{ animation: "fadeSlideIn 0.6s ease 0.1s forwards" }}
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-[1rem] font-semibold text-(--text-primary)">
            Detected Drives
          </h2>
          <span class="text-[0.75rem] text-(--text-muted)">
            {isLoadingDisks
              ? "Scanning…"
              : `${detectedDisks.length} drive${
                detectedDisks.length !== 1 ? "s" : ""
              } found`}
          </span>
        </div>

        {isLoadingDisks
          ? (
            <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  class="rounded-xl h-44 backdrop-blur-sm"
                  style={{
                    background: "var(--ui-bg)",
                    animation: `shimmer 1.5s ease-in-out ${
                      index * 0.15
                    }s infinite`,
                  }}
                />
              ))}
            </div>
          )
          : diskScanError
          ? (
            <div
              class="rounded-xl p-6 flex flex-col items-center gap-3 text-center backdrop-blur-sm"
              style={{ background: "var(--ui-bg)" }}
            >
              <Icon name="triangle-alert" size={28} class="text-(--danger)" />
              <p class="text-[0.85rem] text-(--text-secondary)">
                Failed to scan drives: {diskScanError}
              </p>
              <Button
                class="flex items-center gap-2 py-2 px-4 rounded-lg text-[0.82rem] font-medium cursor-pointer transition-all duration-200 bg-(--accent-dim) text-(--accent) hover:bg-(--accent) hover:text-white"
                onClick={fetchDetectedDisks}
              >
                <Icon name="refresh-cw" size={14} />
                Retry
              </Button>
            </div>
          )
          : detectedDisks.length === 0
          ? (
            <div
              class="rounded-xl p-8 flex flex-col items-center gap-3 text-(--text-muted) text-center backdrop-blur-sm"
              style={{ background: "var(--ui-bg)" }}
            >
              <Icon name="hard-drive" size={32} />
              <p class="text-[0.9rem]">No drives detected</p>
            </div>
          )
          : (
            <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {detectedDisks.map((disk) => (
                <DiskCard
                  key={disk.devicePath}
                  disk={disk}
                  storagePools={storagePools}
                  onAssignToPool={handleOpenAssignDisk}
                />
              ))}
            </div>
          )}
      </section>

      <section
        class="opacity-0"
        style={{ animation: "fadeSlideIn 0.6s ease 0.2s forwards" }}
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-[1rem] font-semibold text-(--text-primary)">
            Storage Pools
          </h2>
          <Button
            class="flex items-center gap-2 py-2 px-4 rounded-lg text-[0.82rem] font-medium cursor-pointer transition-all duration-200 bg-(--accent-dim) text-(--accent) hover:bg-(--accent) hover:text-white"
            onClick={handleOpenCreatePool}
          >
            <Icon name="plus" size={14} />
            New Pool
          </Button>
        </div>

        {storagePools.length === 0
          ? (
            <div
              class="rounded-xl p-10 flex flex-col items-center gap-4 text-center backdrop-blur-sm"
              style={{ background: "var(--ui-bg)" }}
            >
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-(--accent-dim) text-(--accent)">
                <Icon name="layers" size={28} />
              </div>
              <div>
                <p class="text-[0.95rem] font-medium text-(--text-primary) mb-1">
                  No storage pools yet
                </p>
                <p class="text-[0.82rem] text-(--text-secondary) leading-relaxed">
                  Group your drives into pools and assign data categories to
                  organize your storage.
                </p>
              </div>
              <Button
                class="flex items-center justify-center gap-2 py-2.5 px-5 rounded-[10px] text-[0.9rem] font-semibold cursor-pointer transition-all duration-200 bg-(--accent) text-white hover:brightness-110"
                onClick={handleOpenCreatePool}
              >
                <Icon name="plus" size={16} />
                Create your first pool
              </Button>
            </div>
          )
          : (
            <div class="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
              {storagePools.map((pool) => (
                <PoolCard
                  key={pool.poolId}
                  pool={pool}
                  detectedDisks={detectedDisks}
                  onEdit={handleOpenEditPool}
                  onDelete={handleDeletePool}
                />
              ))}
            </div>
          )}
      </section>
    </div>
  );
}
