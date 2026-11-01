use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Persisted app preferences, stored as `settings.json` in the data folder.
/// Auto-start defaults to OFF so shared school-lab machines never surprise
/// users — the event laptop opts in explicitly. Auto-update defaults to ON so
/// a published release reaches every install without anyone remembering to
/// press a button.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub kiosk: bool,
    pub auto_start: bool,
    /// Older settings files predate this field, so fall back to the default.
    #[serde(default = "auto_update_default")]
    pub auto_update: bool,
}

fn auto_update_default() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            kiosk: false,
            auto_start: false,
            auto_update: auto_update_default(),
        }
    }
}

/// Location of the settings file inside the data folder.
pub fn settings_path(data_dir: &Path) -> PathBuf {
    data_dir.join("settings.json")
}

/// Loads the settings file, falling back to defaults when missing or corrupt.
pub fn load(data_dir: &Path) -> AppSettings {
    std::fs::read_to_string(settings_path(data_dir))
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

/// Writes the settings file, creating the data folder if needed.
// A missing auto_update key in an older file is filled in by serde's default.
pub fn save(data_dir: &Path, settings: &AppSettings) -> Result<(), String> {
    std::fs::create_dir_all(data_dir).map_err(|e| format!("failed to create data folder: {e}"))?;
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(settings_path(data_dir), raw).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::AppSettings;

    #[test]
    fn defaults_enable_auto_update() {
        let settings = AppSettings::default();
        assert!(settings.auto_update);
        assert!(!settings.kiosk);
        assert!(!settings.auto_start);
    }

    #[test]
    fn older_settings_files_default_auto_update_on() {
        // A settings.json written before the updater existed has no `autoUpdate`.
        let settings: AppSettings =
            serde_json::from_str(r#"{"kiosk":true,"autoStart":true}"#).unwrap();
        assert!(settings.auto_update);
        assert!(settings.kiosk);
        assert!(settings.auto_start);
    }
}
