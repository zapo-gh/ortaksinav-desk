// src-tauri/src/commands/sql.rs
// Frontend'in auth/lisans gibi yardımcı servisleri için, DbState üzerindeki TEK
// SQLite bağlantısını kullanan genel sorgu komutları. Böylece dosyaya yazan ikinci
// bir bağlantı (tauri-plugin-sql) kalmaz.

use crate::db::DbState;
use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{params_from_iter, Connection};
use serde_json::{json, Map, Number, Value};
use tauri::State;

fn to_sql_value(value: &Value) -> SqlValue {
    match value {
        Value::Null => SqlValue::Null,
        Value::Bool(flag) => SqlValue::Integer(i64::from(*flag)),
        Value::Number(number) => number
            .as_i64()
            .map(SqlValue::Integer)
            .or_else(|| number.as_f64().map(SqlValue::Real))
            .unwrap_or(SqlValue::Null),
        Value::String(text) => SqlValue::Text(text.clone()),
        other => SqlValue::Text(other.to_string()),
    }
}

fn from_value_ref(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(number) => Value::from(number),
        ValueRef::Real(number) => Number::from_f64(number)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        ValueRef::Text(bytes) => Value::String(String::from_utf8_lossy(bytes).into_owned()),
        ValueRef::Blob(bytes) => Value::Array(bytes.iter().map(|byte| Value::from(*byte)).collect()),
    }
}

fn lock_error() -> String {
    "Veritabanı kilitlenemedi".to_string()
}

fn select_rows(conn: &Connection, sql: &str, params: &[Value]) -> Result<Vec<Value>, String> {
    let mut statement = conn.prepare(sql).map_err(|e| e.to_string())?;
    let column_names: Vec<String> = statement
        .column_names()
        .iter()
        .map(|name| name.to_string())
        .collect();
    let bound: Vec<SqlValue> = params.iter().map(to_sql_value).collect();

    let mut rows = statement
        .query(params_from_iter(bound.iter()))
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut object = Map::new();
        for (index, name) in column_names.iter().enumerate() {
            let cell = row.get_ref(index).map_err(|e| e.to_string())?;
            object.insert(name.clone(), from_value_ref(cell));
        }
        result.push(Value::Object(object));
    }
    Ok(result)
}

#[tauri::command]
pub async fn sql_select(
    state: State<'_, DbState>,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<Vec<Value>, String> {
    let conn = state.0.lock().map_err(|_| lock_error())?;
    select_rows(&conn, &sql, &params.unwrap_or_default())
}

#[tauri::command]
pub async fn sql_execute(
    state: State<'_, DbState>,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|_| lock_error())?;
    let bound: Vec<SqlValue> = params
        .unwrap_or_default()
        .iter()
        .map(to_sql_value)
        .collect();

    {
        let mut statement = conn.prepare(&sql).map_err(|e| e.to_string())?;
        // PRAGMA wal_checkpoint gibi ifadeler satır döndürür; execute() bunları reddeder.
        if statement.column_count() > 0 {
            let mut rows = statement
                .query(params_from_iter(bound.iter()))
                .map_err(|e| e.to_string())?;
            while rows.next().map_err(|e| e.to_string())?.is_some() {}
        } else {
            statement
                .execute(params_from_iter(bound.iter()))
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(json!({
        "rowsAffected": conn.changes(),
        "lastInsertId": conn.last_insert_rowid()
    }))
}
