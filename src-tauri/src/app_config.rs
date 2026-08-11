use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Persisted app preferences, stored as `settings.json` in the data folder.
/// Auto-start defaults to OFF so shared school-lab machines never surprise
/// users — the event laptop opts in explicitly.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub kiosk: bool,
    pub auto_start: bool,
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
pub fn save(data_dir: &Path, settings: &AppSettings) -> Result<(), String> {
    std::fs::create_dir_all(data_dir).map_err(|e| format!("failed to create data folder: {e}"))?;
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(settings_path(data_dir), raw).map_err(|e| e.to_string())?;
    Ok(())
}
