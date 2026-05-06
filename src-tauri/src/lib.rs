use ort::session::Session;
use rusqlite::{Connection, params};
use std::sync::Mutex;
use tauri::Manager;
use std::path::PathBuf;
use serde_json::Value as JsonValue;
use std::fs;

struct AppState {
    onnx_session: Mutex<Option<Session>>,
    db_path: Mutex<Option<PathBuf>>,
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
        .invoke_handler(tauri::generate_handler![run_prediction, run_batch_prediction, query_db, save_excel_to_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
