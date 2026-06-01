use ort::session::Session;
use rusqlite::{Connection, params};
use std::sync::Mutex;
use tauri::Manager;
use tauri::Emitter;
use std::path::PathBuf;
use serde_json::Value as JsonValue;
use std::fs;

struct AppState {
    onnx_session: Mutex<Option<Session>>,
    db_path: Mutex<Option<PathBuf>>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AIInputFile {
    source_path: String,
    target_name: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AIMergeResult {
    json_path: String,
    xlsx_path: String,
    row_count: usize,
    paper_count: usize,
}

fn resolve_python_executable(v3_root: &str, python_path: Option<String>) -> PathBuf {
    if let Some(p) = python_path {
        if !p.is_empty() {
            return PathBuf::from(p);
        }
    }

    let v3_root_path = PathBuf::from(v3_root);
    let venv_candidates = [
        v3_root_path.join("venv/Scripts/python.exe"),
        v3_root_path.join(".venv/Scripts/python.exe"),
        v3_root_path.join("venv/bin/python"),
        v3_root_path.join(".venv/bin/python"),
    ];

    for candidate in venv_candidates {
        if candidate.exists() {
            return candidate;
        }
    }

    PathBuf::from("python")
}

#[tauri::command]
async fn save_excel_to_path(content: Vec<u8>, full_path: String) -> Result<String, String> {
    let path = PathBuf::from(full_path);
    
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn run_prediction(state: tauri::State<'_, AppState>, input: Vec<JsonValue>) -> Result<f32, String> {
    let mut session_lock = state.onnx_session.lock().unwrap();
    let session = session_lock.as_mut().ok_or("ONNX Session not initialized")?;

    let input_nodes = session.inputs();
    let input_names: Vec<String> = input_nodes.iter().map(|i| i.name().to_string()).collect();
    
    let mut session_inputs: Vec<(&str, ort::value::Value)> = Vec::new();

    if input.len() != 18 {
        return Err(format!("Frontend sent {} features, but model expects 18.", input.len()));
    }

    for (i, name) in input_names.iter().enumerate() {
        let node = &input_nodes[i];
        let json_val = &input[i];
        
        let is_string = format!("{:?}", node).contains("String");

        if is_string {
            let val_str = if json_val.is_string() {
                json_val.as_str().unwrap().to_string()
            } else {
                json_val.to_string().replace("\"", "")
            };

            let array = ndarray::Array2::from_shape_vec((1, 1), vec![val_str])
                .map_err(|e| format!("Failed to create string array for {}: {}", name, e))?;
            let tensor = ort::value::Value::from_string_array(&array)
                .map_err(|e| format!("Failed to create string tensor for {}: {}", name, e))?;
            session_inputs.push((name.as_str(), tensor.into()));
        } else {
            let val_f32 = json_val.as_f64().unwrap_or(0.0) as f32;

            let array = ndarray::Array2::from_shape_vec((1, 1), vec![val_f32])
                .map_err(|e| format!("Failed to create float array for {}: {}", name, e))?;
            let tensor = ort::value::Value::from_array(array).map_err(|e| e.to_string())?;
            session_inputs.push((name.as_str(), tensor.into()));
        }
    }

    let output = session.run(session_inputs)
        .map_err(|e| format!("Inference execution failed: {}", e))?;

    let output_data = output[0].try_extract_tensor::<f32>()
        .map_err(|e| format!("Failed to extract output: {}", e))?;

    Ok(output_data.1[0])
}

#[tauri::command]
async fn run_batch_prediction(state: tauri::State<'_, AppState>, inputs: Vec<Vec<JsonValue>>) -> Result<Vec<f32>, String> {
    let mut session_lock = state.onnx_session.lock().unwrap();
    let session = session_lock.as_mut().ok_or("ONNX Session not initialized")?;

    let num_rows = inputs.len();
    if num_rows == 0 { return Ok(vec![]); }

    let input_nodes = session.inputs();
    let input_names: Vec<String> = input_nodes.iter().map(|i| i.name().to_string()).collect();
    
    // Check vector size consistency
    if inputs[0].len() != 18 {
        return Err(format!("Row 0 has {} features, but model expects 18.", inputs[0].len()));
    }

    // Transpose data: from [rows][cols] to [cols][rows]
    let mut session_inputs: Vec<(&str, ort::value::Value)> = Vec::new();

    for (col_idx, name) in input_names.iter().enumerate() {
        let node = &input_nodes[col_idx];
        let is_string = format!("{:?}", node).contains("String");

        if is_string {
            let mut col_data = Vec::with_capacity(num_rows);
            for row_idx in 0..num_rows {
                let json_val = &inputs[row_idx][col_idx];
                let val_str = if json_val.is_string() {
                    json_val.as_str().unwrap().to_string()
                } else {
                    json_val.to_string().replace("\"", "")
                };
                col_data.push(val_str);
            }
            let array = ndarray::Array2::from_shape_vec((num_rows, 1), col_data)
                .map_err(|e| format!("Failed to create string array for batch {}: {}", name, e))?;
            let tensor = ort::value::Value::from_string_array(&array)
                .map_err(|e| format!("Failed to create string tensor for batch {}: {}", name, e))?;
            session_inputs.push((name.as_str(), tensor.into()));
        } else {
            let mut col_data = Vec::with_capacity(num_rows);
            for row_idx in 0..num_rows {
                let json_val = &inputs[row_idx][col_idx];
                let val_f32 = json_val.as_f64().unwrap_or(0.0) as f32;
                col_data.push(val_f32);
            }
            let array = ndarray::Array2::from_shape_vec((num_rows, 1), col_data)
                .map_err(|e| format!("Failed to create float array for batch {}: {}", name, e))?;
            let tensor = ort::value::Value::from_array(array).map_err(|e| e.to_string())?;
            session_inputs.push((name.as_str(), tensor.into()));
        }
    }

    let output = session.run(session_inputs)
        .map_err(|e| format!("Batch inference execution failed: {}", e))?;

    let output_data = output[0].try_extract_tensor::<f32>()
        .map_err(|e| format!("Failed to extract batch output: {}", e))?;

    Ok(output_data.1.to_vec())
}

#[tauri::command]
async fn query_db(state: tauri::State<'_, AppState>, sql: String, _params_vec: Vec<String>) -> Result<String, String> {
    let db_path = state.db_path.lock().unwrap();
    let path = db_path.as_ref().ok_or("Database path not set")?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map(params![], |row| {
        let count = row.as_ref().column_count();
        let mut map = std::collections::HashMap::new();
        for i in 0..count {
            let name = row.as_ref().column_name(i).unwrap().to_string();
            let val = row.get::<_, rusqlite::types::Value>(i).unwrap();
            let value_str = match val {
                rusqlite::types::Value::Null => "NULL".to_string(),
                rusqlite::types::Value::Integer(v) => v.to_string(),
                rusqlite::types::Value::Real(v) => v.to_string(),
                rusqlite::types::Value::Text(v) => v,
                rusqlite::types::Value::Blob(_) => "BLOB".to_string(),
            };
            map.insert(name, value_str);
        }
        Ok(map)
    }).map_err(|e| e.to_string())?;

    let result: Vec<_> = rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_file_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Unsupported OS".to_string())
    }
}

#[tauri::command]
async fn prepare_input_environment(v3_root: String, files: Vec<AIInputFile>) -> Result<String, String> {
    let temp_dir = PathBuf::from(&v3_root).join("temp_input");
    
    // 1. Clean or Create temp_input
    if temp_dir.exists() {
        std::fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    // 2. Ensure infrastructure exists (in case user manually deleted them)
    let runs_dir = PathBuf::from(&v3_root).join("runs");
    let output_dir = PathBuf::from(&v3_root).join("output");
    if !runs_dir.exists() { std::fs::create_dir_all(&runs_dir).map_err(|e| e.to_string())?; }
    if !output_dir.exists() { std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?; }

    // 3. Copy selected files using stable unique temp names.
    for file in files {
        let src = PathBuf::from(&file.source_path);
        let target_name = PathBuf::from(&file.target_name)
            .file_name()
            .ok_or_else(|| format!("Invalid target file name: {}", file.target_name))?
            .to_owned();
        let dest = temp_dir.join(target_name);
        std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    }

    Ok(temp_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn run_ai_extraction(
    window: tauri::Window,
    input_dir: String,
    v3_root: String,
    python_path: Option<String>,
    concurrency: i32,
) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::io::{BufRead, BufReader};
    use std::thread;

    let python_exe = resolve_python_executable(&v3_root, python_path);

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    
    let mut command = Command::new(python_exe);
    
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command
        .arg("-u")
        .arg("run_v3_ultimate.py")
        .arg("--input-dir")
        .arg(&input_dir)
        .arg("--concurrency")
        .arg(concurrency.to_string())
        .current_dir(&v3_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start extraction engine: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture extraction stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture extraction stderr")?;
    let stdout_window = window.clone();
    let stderr_window = window.clone();

    // Spawn thread to read stdout and emit events
    let stdout_handle = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                // Emit progress event to frontend
                let _ = stdout_window.emit("extraction-progress", l);
            }
        }
    });

    // Consume stderr too, otherwise a noisy Python process can fill the pipe and block.
    let stderr_handle = thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                let log_line = if l.contains(" | ERROR | ")
                    || l.contains(" - ERROR - ")
                    || l.contains("Traceback ")
                    || l.contains("Exception")
                    || l.contains("FATAL")
                {
                    format!("[ERROR] {}", l)
                } else if l.contains(" | WARNING | ") || l.contains(" - WARNING - ") {
                    format!("[WARN] {}", l)
                } else {
                    l
                };
                let _ = stderr_window.emit("extraction-progress", log_line);
            }
        }
    });

    let status = child.wait().map_err(|e| e.to_string())?;
    let _ = stdout_handle.join();
    let _ = stderr_handle.join();
    
    if status.success() {
        Ok("Extraction completed successfully".to_string())
    } else {
        Err("Extraction engine failed. Check logs for details.".to_string())
    }
}

#[tauri::command]
async fn get_latest_xlsx_path(dir: String) -> Result<String, String> {
    let paths = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut files: Vec<_> = paths
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().extension().map_or(false, |ext| ext == "xlsx") &&
            entry.path().file_name().map_or(false, |name| name.to_string_lossy().starts_with("Extraction_Result_"))
        })
        .collect();

    files.sort_by_key(|entry| {
        entry.metadata().and_then(|m| m.modified()).ok()
    });

    if let Some(latest) = files.last() {
        Ok(latest.path().to_string_lossy().to_string())
    } else {
        Err("No .xlsx files found in the output directory".to_string())
    }
}

#[tauri::command]
async fn copy_file_to_location(src: String, dest: String) -> Result<(), String> {
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn merge_ai_results(
    v3_root: String,
    run_dirs: Vec<String>,
    python_path: Option<String>,
) -> Result<AIMergeResult, String> {
    use std::process::Command;
    use std::time::{SystemTime, UNIX_EPOCH};

    if run_dirs.is_empty() {
        return Err("No completed extraction runs to merge".to_string());
    }

    let v3_root_path = PathBuf::from(&v3_root);
    let output_dir = v3_root_path.join("output");
    if !output_dir.exists() {
        std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let output_name = format!("Extraction_Result_Workspace_{}", timestamp);
    let json_path = output_dir.join(format!("{}.json", output_name));
    let xlsx_path = output_dir.join(format!("{}.xlsx", output_name));

    let python_exe = resolve_python_executable(&v3_root, python_path);
    let mut command = Command::new(python_exe);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let output = command
        .arg("-u")
        .arg("run_merge_exports.py")
        .arg("--output-name")
        .arg(&output_name)
        .arg("--run-dirs")
        .args(&run_dirs)
        .current_dir(&v3_root)
        .output()
        .map_err(|e| format!("Failed to start result merge: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("Result merge failed: {}\n{}", stderr.trim(), stdout.trim()));
    }

    if !json_path.exists() || !xlsx_path.exists() {
        return Err("Result merge completed but did not produce JSON/XLSX files".to_string());
    }

    let json_text = std::fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read merged JSON: {}", e))?;
    let row_count = match serde_json::from_str::<JsonValue>(&json_text).map_err(|e| e.to_string())? {
        JsonValue::Array(rows) => rows.len(),
        _ => 0,
    };

    let paper_count = run_dirs
        .iter()
        .filter(|run_dir| {
            let path = PathBuf::from(run_dir);
            let resolved = if path.is_absolute() {
                path
            } else {
                v3_root_path.join("runs").join(run_dir)
            };
            resolved.join("outputs").join("export_rows.json").exists()
        })
        .count();

    Ok(AIMergeResult {
        json_path: json_path.to_string_lossy().to_string(),
        xlsx_path: xlsx_path.to_string_lossy().to_string(),
        row_count,
        paper_count,
    })
}

#[tauri::command]
async fn read_json_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn read_latest_json_result(dir: String) -> Result<String, String> {
    let paths = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut files: Vec<_> = paths
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().extension().map_or(false, |ext| ext == "json") && 
            entry.path().file_name().map_or(false, |name| name.to_string_lossy().starts_with("Extraction_Result_"))
        })
        .collect();

    files.sort_by_key(|entry| {
        entry.metadata().and_then(|m| m.modified()).ok()
    });

    if let Some(latest) = files.last() {
        std::fs::read_to_string(latest.path()).map_err(|e| format!("Failed to read file: {}", e))
    } else {
        Err("No JSON result files found in the output directory".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) // Initialize dialog plugin
        .manage(AppState {
            onnx_session: Mutex::new(None),
            db_path: Mutex::new(None),
        })
        .setup(|app| {
            let handle = app.handle();
            let resource_path = handle.path().resource_dir().unwrap();
            
            let model_path = resource_path.join("assets/svm_model.onnx");
            if model_path.exists() {
                let session = Session::builder()
                    .unwrap()
                    .commit_from_file(&model_path)
                    .unwrap();
                
                let state = handle.state::<AppState>();
                *state.onnx_session.lock().unwrap() = Some(session);
            }

            let db_path = resource_path.join("assets/crm_database_v2.db");
            if db_path.exists() {
                let state = handle.state::<AppState>();
                *state.db_path.lock().unwrap() = Some(db_path);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_prediction, 
            run_batch_prediction, 
            query_db, 
            save_excel_to_path,
            run_ai_extraction,
            open_file_in_folder,
            copy_file_to_location,
            merge_ai_results,
            get_latest_xlsx_path,
            prepare_input_environment,
            read_json_file,
            read_latest_json_result
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
