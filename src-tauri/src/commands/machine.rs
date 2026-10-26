// src-tauri/src/commands/machine.rs
// Makine kimliği. Lisanslar bu kimliğe bağlanabildiği için hesaplama biçimi kritiktir.

use sha2::{Digest, Sha256};

const MACHINE_ID_LENGTH: usize = 32;

#[cfg(windows)]
fn read_machine_guid() -> String {
    use winreg::enums::*;
    use winreg::RegKey;
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    hklm.open_subkey(r"SOFTWARE\Microsoft\Cryptography")
        .and_then(|key| key.get_value::<String, _>("MachineGuid"))
        .unwrap_or_else(|_| "unknown-machine".to_string())
}

#[cfg(not(windows))]
fn read_machine_guid() -> String {
    std::fs::read_to_string("/etc/machine-id")
        .map(|content| content.trim().to_string())
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unknown-machine".to_string())
}

fn sha256_hex(input: &str) -> String {
    format!("{:x}", Sha256::digest(input.as_bytes()))
}

/// Eski sürümlerin ürettiği kimlik: SHA-256 değil, ham GUID'in hex gösterimi.
/// Bu kimliğe bağlı mevcut lisansların geçerli kalması için hâlâ üretilir.
fn legacy_hex_identifier(raw: &str) -> String {
    raw.as_bytes()
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect::<String>()
        .chars()
        .take(MACHINE_ID_LENGTH)
        .collect()
}

#[tauri::command]
pub fn get_machine_id() -> String {
    sha256_hex(&read_machine_guid())
        .chars()
        .take(MACHINE_ID_LENGTH)
        .collect()
}

#[tauri::command]
pub fn get_legacy_machine_id() -> String {
    legacy_hex_identifier(&read_machine_guid())
}
