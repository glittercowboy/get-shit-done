// Configuration Manager for GSD
// Handles editor-specific configuration and fallbacks

const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor(editorType = null) {
    this.editorType = editorType || this.detectEditor();
    this.configPaths = {
      claude: path.join(os.homedir(), '.claude', 'settings.json'),
      opencode: path.join(os.homedir(), '.opencode', 'settings.json')
    };
  }

  detectEditor() {
    // Check for OpenCode first
    const opencodePath = path.join(os.homedir(), '.opencode');
    if (fs.existsSync(opencodePath)) {
      return 'opencode';
    }

    // Check for Claude
    const claudePath = path.join(os.homedir(), '.claude');
    if (fs.existsSync(claudePath)) {
      return 'claude';
    }

    // Default to Claude for backward compatibility
    return 'claude';
  }

  getConfigPath() {
    return this.configPaths[this.editorType];
  }

  loadConfig() {
    const configPath = this.getConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (e) {
        console.warn(`Warning: Could not parse config file ${configPath}:`, e.message);
      }
    }
    return {};
  }

  saveConfig(config) {
    const configPath = this.getConfigPath();
    const configDir = path.dirname(configPath);

    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  getGSDConfig() {
    const config = this.loadConfig();
    return config.gsd || {};
  }

  setGSDConfig(gsdConfig) {
    const config = this.loadConfig();
    config.gsd = { ...config.gsd, ...gsdConfig };
    this.saveConfig(config);
  }

  getEditorSpecificConfig() {
    const config = this.loadConfig();

    // Return editor-specific settings with fallbacks
    const defaults = {
      maxConcurrentAgents: 3,
      skipCheckpoints: true,
      minPlansForParallel: 2
    };

    if (this.editorType === 'opencode') {
      // For OpenCode, check both extension config and GSD config
      const extensionConfig = config['gsd-opencode'] || {};
      return { ...defaults, ...extensionConfig, ...config.gsd };
    } else {
      // For Claude, use GSD config with defaults
      return { ...defaults, ...config.gsd };
    }
  }

  // Utility methods for common config operations
  getMaxConcurrentAgents() {
    return this.getEditorSpecificConfig().maxConcurrentAgents || 3;
  }

  shouldSkipCheckpoints() {
    return this.getEditorSpecificConfig().skipCheckpoints !== false;
  }

  getMinPlansForParallel() {
    return this.getEditorSpecificConfig().minPlansForParallel || 2;
  }

  // Migration helpers for upgrading from single-editor to multi-editor
  migrateFromClaudeOnly() {
    const claudeConfigPath = this.configPaths.claude;
    const opencodeConfigPath = this.configPaths.opencode;

    if (fs.existsSync(claudeConfigPath) && !fs.existsSync(opencodeConfigPath)) {
      try {
        const claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
        if (claudeConfig.gsd) {
          // Copy GSD config to OpenCode if user switches
          const opencodeConfig = { gsd: claudeConfig.gsd };
          fs.writeFileSync(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2));
          console.log('Migrated GSD configuration to OpenCode');
        }
      } catch (e) {
        console.warn('Could not migrate config:', e.message);
      }
    }
  }
}

module.exports = ConfigManager;