use tauri::{command, Window};
use reqwest::Client;
use serde::Deserialize;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use std::fs;
use std::process::Command;

#[derive(Debug, Deserialize)]
struct RequestData {
    file_ids: Vec<i32>,
}

#[command]
pub async fn download_and_save_file(
    url: String,
    save_path: String,
    file_ids: Vec<i32>,
    method: String,
) -> Result<String, String> {
    // HTTP 클라이언트 생성
    let client = Client::new();
    
    let mut request_builder = match method.to_uppercase().as_str() {
        "POST" => {
            let request_data = RequestData { file_ids };
            client.post(&url).json(&request_data)
        },
        _ => client.get(&url),
    };
    
    // 요청 보내기
    let response = request_builder
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    // 응답 확인
    if !response.status().is_success() {
        return Err(format!("서버 응답 오류: {}", response.status()));
    }
    
    // 응답 본문 (파일) 다운로드
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    
    // 파일 저장
    let mut file = File::create(&save_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    
    Ok(save_path)
}

#[command]
pub fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args([&path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args([&path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .args([&path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[command]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[command]
pub fn save_file_content(path: String, content: String) -> Result<(), String> {
    let mut file = File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn read_file_content(path: String) -> Result<String, String> {
    let mut file = File::open(&path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;
    Ok(content)
}
