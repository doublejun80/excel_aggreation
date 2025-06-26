// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri::Manager;
use commands::{download_and_save_file, open_folder, get_version, save_file_content, read_file_content};

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      commands::download_and_save_file,
      commands::open_folder,
      commands::get_version,
      commands::save_file_content,
      commands::read_file_content
    ])
    .run(tauri::generate_context!())
    .expect("오류: Tauri 앱을 실행하는 데 실패했습니다.");
}
