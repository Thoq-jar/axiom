export function renderDropdown(
  id: string,
  title: string,
  content: string,
  isOpen: boolean = false,
): string {
  return `
    <div class="dropdown" data-dropdown="${id}">
      <button type="button" class="dropdown-header" data-dropdown-toggle="${id}">
        <span>${title}</span>
        <i class="fa-solid fa-chevron-down dropdown-icon"></i>
      </button>
      <div class="dropdown-content${
    isOpen ? "" : " hidden"
  }" data-dropdown-content="${id}">
        ${content}
      </div>
    </div>
  `;
}

let dropdownListenerAttached = false;

export function initDropdowns(): void {
  if (!dropdownListenerAttached) {
    document.body.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      const toggle = target.closest("[data-dropdown-toggle]") as HTMLElement;
      if (!toggle) return;

      const id = toggle.dataset.dropdownToggle;
      if (!id) return;

      const content = document.querySelector(
        `[data-dropdown-content="${id}"]`,
      ) as HTMLElement;
      if (!content) return;

      if (content.contains(target) && !toggle.contains(target)) {
        return;
      }

      const icon = toggle.querySelector(".dropdown-icon") as HTMLElement;
      const dropdown = toggle.closest(".dropdown") as HTMLElement;

      e.preventDefault();
      e.stopPropagation();

      const isOpen = !content.classList.contains("hidden");
      content.classList.toggle("hidden", isOpen);
      if (dropdown) {
        dropdown.classList.toggle("open", !isOpen);
      }

      if (icon) {
        icon.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
      }
    });
    dropdownListenerAttached = true;
  }
}

export function renderDetailCard(
  title: string,
  icon: string,
  value: string,
  subtitle: string = "",
  extra: string = "",
): string {
  return `
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-icon">
          <i class="${icon}"></i>
        </div>
        <div class="detail-title-group">
          <h3 class="detail-title">${title}</h3>
          ${subtitle ? `<p class="detail-subtitle">${subtitle}</p>` : ""}
        </div>
      </div>
      <div class="detail-value">${value}</div>
      ${extra ? `<div class="detail-extra">${extra}</div>` : ""}
    </div>
  `;
}

export function renderInfoRow(label: string, value: string): string {
  return `
    <div class="info-row">
      <span class="info-label">${label}</span>
      <span class="info-value">${value}</span>
    </div>
  `;
}
