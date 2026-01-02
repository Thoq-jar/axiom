export function renderDock(): string {
  return `
    <div class="dock" id="dock">
      <div class="dock-item active" data-page="monitor">
        <i class="fa-solid fa-chart-line"></i>
        <span>Monitor</span>
      </div>
      <div class="dock-item" data-page="cpu-details">
        <i class="fa-solid fa-microchip"></i>
        <span>CPU</span>
      </div>
      <div class="dock-item" data-page="memory-details">
        <i class="fa-solid fa-memory"></i>
        <span>Memory</span>
      </div>
      <div class="dock-item" data-page="about">
        <i class="fa-solid fa-info-circle"></i>
        <span>About</span>
      </div>
    </div>
  `;
}

export function initDock(navigateFn: (page: string) => void): void {
  const dock = document.getElementById("dock");
  if (!dock) return;

  dock.addEventListener("click", (e: MouseEvent) => {
    const item = (e.target as HTMLElement).closest(".dock-item");
    if (!item) return;

    const page = (item as HTMLElement).dataset.page;
    if (page) {
      globalThis.location.hash = page;
      navigateFn(page);
    }
  });
}

export function updateDockActive(page: string): void {
  const dock = document.getElementById("dock");
  if (!dock) return;

  dock.querySelectorAll(".dock-item").forEach((item) => {
    item.classList.toggle(
      "active",
      (item as HTMLElement).dataset.page === page,
    );
  });
}
