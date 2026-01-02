export function renderDropdown(id, title, content, isOpen = false) {
  return `
    <div class="dropdown" data-dropdown="${id}">
      <button class="dropdown-header" data-dropdown-toggle="${id}">
        <span>${title}</span>
        <i class="fa-solid fa-chevron-down dropdown-icon"></i>
      </button>
      <div class="dropdown-content${isOpen ? '' : ' hidden'}" data-dropdown-content="${id}">
        ${content}
      </div>
    </div>
  `;
}

export function initDropdowns() {
  document.querySelectorAll('[data-dropdown-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const id = toggle.dataset.dropdownToggle;
      const content = document.querySelector(`[data-dropdown-content="${id}"]`);
      const icon = toggle.querySelector('.dropdown-icon');
      const dropdown = toggle.closest('.dropdown');
      
      if (content) {
        const isOpen = !content.classList.contains('hidden');
        content.classList.toggle('hidden', isOpen);
        dropdown.classList.toggle('open', !isOpen);
        
        if (icon) {
          icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      }
    });
  });
}

export function renderDetailCard(title, icon, value, subtitle = '', extra = '') {
  return `
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-icon">
          <i class="${icon}"></i>
        </div>
        <div class="detail-title-group">
          <h3 class="detail-title">${title}</h3>
          ${subtitle ? `<p class="detail-subtitle">${subtitle}</p>` : ''}
        </div>
      </div>
      <div class="detail-value">${value}</div>
      ${extra ? `<div class="detail-extra">${extra}</div>` : ''}
    </div>
  `;
}

export function renderInfoRow(label, value) {
  return `
    <div class="info-row">
      <span class="info-label">${label}</span>
      <span class="info-value">${value}</span>
    </div>
  `;
}

