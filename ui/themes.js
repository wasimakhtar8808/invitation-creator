/**
 * Open/Closed Theme configuration schema.
 * New themes can be added here without modifying the core builder logic.
 */

export const THEMES = {
  'romantic-wedding': {
    id: 'romantic-wedding',
    name: '🌸 Romantic Wedding',
    cssVariables: {
      '--accent-color': '#d81b60',
      '--accent-rgb': '216, 27, 96',
      '--bg-gradient': 'radial-gradient(circle at 10% 20%, rgb(253, 239, 244) 0%, rgb(249, 215, 226) 90%)',
      '--glass-bg': 'rgba(255, 255, 255, 0.45)',
      '--glass-border': 'rgba(255, 255, 255, 0.6)',
      '--glass-shadow': 'rgba(216, 27, 96, 0.08)',
      '--text-primary': '#4a1223',
      '--text-secondary': '#824657',
      '--font-title': "'Playfair Display', serif",
      '--font-body': "'Outfit', sans-serif",
      '--glow-color': 'rgba(216, 27, 96, 0.3)',
      '--card-radius': '24px'
    },
    decorationsHTML: `
      <div class="floating-decorations select-none pointer-events-none">
        <div class="decor-item item-1">🌸</div>
        <div class="decor-item item-2">💖</div>
        <div class="decor-item item-3">🌸</div>
        <div class="decor-item item-4">✨</div>
        <div class="decor-item item-5">💕</div>
      </div>
    `
  },
  'party-neon': {
    id: 'party-neon',
    name: '⚡ Party Neon (Dark)',
    cssVariables: {
      '--accent-color': '#00f0ff',
      '--accent-rgb': '0, 240, 255',
      '--bg-gradient': 'radial-gradient(circle at 50% 50%, rgb(15, 7, 30) 0%, rgb(2, 0, 5) 100%)',
      '--glass-bg': 'rgba(10, 5, 20, 0.65)',
      '--glass-border': 'rgba(255, 0, 127, 0.3)',
      '--glass-shadow': 'rgba(255, 0, 127, 0.2)',
      '--text-primary': '#ffffff',
      '--text-secondary': '#b0a9bd',
      '--font-title': "'Syncopate', sans-serif",
      '--font-body': "'Outfit', sans-serif",
      '--glow-color': 'rgba(255, 0, 127, 0.6)',
      '--card-radius': '16px'
    },
    decorationsHTML: `
      <div class="floating-decorations select-none pointer-events-none">
        <div class="decor-item item-1" style="color: #ff007f; text-shadow: 0 0 10px #ff007f;">⚡</div>
        <div class="decor-item item-2" style="color: #00f0ff; text-shadow: 0 0 10px #00f0ff;">🎈</div>
        <div class="decor-item item-3" style="color: #00ff66; text-shadow: 0 0 10px #00ff66;">🔥</div>
        <div class="decor-item item-4" style="color: #ffff00; text-shadow: 0 0 10px #ffff00;">✨</div>
      </div>
    `
  },
  'formal-corporate': {
    id: 'formal-corporate',
    name: '🏢 Formal Corporate',
    cssVariables: {
      '--accent-color': '#1a365d',
      '--accent-rgb': '26, 54, 93',
      '--bg-gradient': 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
      '--glass-bg': 'rgba(255, 255, 255, 0.7)',
      '--glass-border': 'rgba(255, 255, 255, 0.8)',
      '--glass-shadow': 'rgba(26, 54, 93, 0.05)',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--font-title': "'Outfit', sans-serif",
      '--font-body': "'Outfit', sans-serif",
      '--glow-color': 'rgba(26, 54, 93, 0.2)',
      '--card-radius': '8px'
    },
    decorationsHTML: `
      <div class="floating-decorations select-none pointer-events-none">
        <div class="decor-item item-1">📊</div>
        <div class="decor-item item-2">🌐</div>
        <div class="decor-item item-3">💼</div>
        <div class="decor-item item-4">✨</div>
      </div>
    `
  },
  'baby-shower': {
    id: 'baby-shower',
    name: '🍼 Baby Shower',
    cssVariables: {
      '--accent-color': '#ffb6c1',
      '--accent-rgb': '255, 182, 193',
      '--bg-gradient': 'linear-gradient(120deg, #e0f2fe 0%, #fae8ff 100%)',
      '--glass-bg': 'rgba(255, 255, 255, 0.5)',
      '--glass-border': 'rgba(255, 255, 255, 0.7)',
      '--glass-shadow': 'rgba(255, 182, 193, 0.1)',
      '--text-primary': '#1e3a8a',
      '--text-secondary': '#6b7280',
      '--font-title': "'Comfortaa', cursive",
      '--font-body': "'Outfit', sans-serif",
      '--glow-color': 'rgba(255, 182, 193, 0.4)',
      '--card-radius': '30px'
    },
    decorationsHTML: `
      <div class="floating-decorations select-none pointer-events-none">
        <div class="decor-item item-1">🎈</div>
        <div class="decor-item item-2">🧸</div>
        <div class="decor-item item-3">🫧</div>
        <div class="decor-item item-4">🌟</div>
        <div class="decor-item item-5">🫧</div>
      </div>
    `
  }
};

export class ThemeEngine {
  /**
   * Applies the theme's variables to the document element
   * and injects background decorations into the container.
   */
  static apply(themeId, containerElement = document.body) {
    const theme = THEMES[themeId] || THEMES['romantic-wedding'];
    
    // 1. Set CSS Variables on root document or container
    const root = document.documentElement;
    Object.entries(theme.cssVariables).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });

    // 2. Remove existing theme decorations from container
    const existingDecor = containerElement.querySelector('.floating-decorations');
    if (existingDecor) {
      existingDecor.remove();
    }

    // 3. Inject new decorations
    if (theme.decorationsHTML) {
      const template = document.createElement('div');
      template.innerHTML = theme.decorationsHTML.trim();
      const decorNode = template.firstChild;
      containerElement.appendChild(decorNode);
    }
    
    return theme;
  }
}
