const colorThemes = {
  violet: { accent: '#8b5cf6', accentDim: 'rgba(139, 92, 246, 0.15)' },
  blue: { accent: '#3b82f6', accentDim: 'rgba(59, 130, 246, 0.15)' },
  cyan: { accent: '#06b6d4', accentDim: 'rgba(6, 182, 212, 0.15)' },
  emerald: { accent: '#10b981', accentDim: 'rgba(16, 185, 129, 0.15)' },
  rose: { accent: '#f43f5e', accentDim: 'rgba(244, 63, 94, 0.15)' },
  orange: { accent: '#f97316', accentDim: 'rgba(249, 115, 22, 0.15)' },
  amber: { accent: '#f59e0b', accentDim: 'rgba(245, 158, 11, 0.15)' },
  slate: { accent: '#64748b', accentDim: 'rgba(100, 116, 139, 0.15)' }
};

let currentTheme = localStorage.getItem('theme') || 'violet';

export function applyTheme(themeName) {
  const theme = colorThemes[themeName];
  if (!theme) return;
  
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent-dim', theme.accentDim);
  
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.color === themeName);
  });
  
  currentTheme = themeName;
  localStorage.setItem('theme', themeName);
}

export function initTheme() {
  applyTheme(currentTheme);
  
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      const color = option.dataset.color;
      applyTheme(color);
    });
  });
}

