/* ====== Admin Theme Functions Module ====== */

// Use global API_BASE_URL from admin-api-service.js (don't redeclare)
// const API_BASE_URL will be available from the global scope

// ====== Admin Theme Utilities ======
// Note: Base ThemeManager is loaded from ../theme-manager.js
// These are admin-specific theme functions

/**
 * Save custom theme to server (Admin-only)
 */
async function saveCustomThemeToServer(themeData) {
  try {
    // Get fresh token
    const token = localStorage.getItem('admin_token');
    if (!token) {
      throw new Error('No admin token found');
    }
    
    // Save to server
    const response = await fetch(`${window.API_BASE_URL}/theme`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(themeData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save theme to server');
    }
    
    // Apply theme immediately
    applyThemeVariables(themeData);
    if (window.themeManager) {
      window.themeManager.setTheme(window.themeManager.getCurrentTheme());
    }
    
    // Update admin preview
    updateThemePreview(themeData);
    
    // Clear localStorage cache so main site will reload theme from server
    localStorage.removeItem('customTheme');
    console.log('✅ Cleared localStorage cache - main site will reload theme');
      
    return true;
  } catch (error) {
    console.error('Error saving theme to server:', error);
    return false;
  }
}

/**
 * Reset theme to defaults (Admin-only)
 */
async function resetThemeToDefaults() {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      throw new Error('No admin token found');
    }
    
    // Reset on server
    const response = await fetch(`${window.API_BASE_URL}/theme`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset theme on server');
    }
  
    const data = await response.json();
    if (data.success && data.theme) {
      // Apply default theme
      applyThemeVariables(data.theme);
      if (window.themeManager) {
        window.themeManager.setTheme(window.themeManager.getCurrentTheme());
      }
      updateThemePreview(data.theme);
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting theme:', error);
    return false;
  }
}

/**
 * Update theme preview in admin panel
 */
function updateThemePreview(themeData) {
  // Update color preview texts
  const textElements = {
    lightBgPreview: themeData.light.bg,
    lightPanelPreview: themeData.light.panel,
    lightInkPreview: themeData.light.ink,
    lightMutedPreview: themeData.light.muted,
    lightLinePreview: themeData.light.line,
    lightAccentPreview: themeData.light.accent,
    darkBgPreview: themeData.dark.bg,
    darkPanelPreview: themeData.dark.panel,
    darkInkPreview: themeData.dark.ink,
    darkMutedPreview: themeData.dark.muted,
    darkLinePreview: themeData.dark.line,
    darkAccentPreview: themeData.dark.accent,
    borderRadius: `${themeData.borderRadius}px`,
    shadowIntensity: `${themeData.shadowIntensity}%`,
    fontFamily: themeData.fontFamily
  };
  
  // Update text content
  Object.entries(textElements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
  
  // Update color swatch backgrounds
  const colorSwatches = {
    lightBgSwatch: themeData.light.bg,
    lightPanelSwatch: themeData.light.panel,
    lightInkSwatch: themeData.light.ink,
    lightMutedSwatch: themeData.light.muted,
    lightLineSwatch: themeData.light.line,
    lightAccentSwatch: themeData.light.accent,
    darkBgSwatch: themeData.dark.bg,
    darkPanelSwatch: themeData.dark.panel,
    darkInkSwatch: themeData.dark.ink,
    darkMutedSwatch: themeData.dark.muted,
    darkLineSwatch: themeData.dark.line,
    darkAccentSwatch: themeData.dark.accent
  };
  
  // Update swatch background colors
  Object.entries(colorSwatches).forEach(([id, color]) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.backgroundColor = color;
    }
  });
}

// Make functions globally available
if (typeof window !== 'undefined') {
  window.saveCustomThemeToServer = saveCustomThemeToServer;
  window.resetThemeToDefaults = resetThemeToDefaults;
  window.updateThemePreview = updateThemePreview;
}

console.log('📦 Admin Theme Functions Module loaded');
