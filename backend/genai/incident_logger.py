import os
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
DB_PATH = os.path.join(DB_DIR, 'digital_twin_incidents.db')

def get_db_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    with conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS incident_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                timestep_hour INTEGER,
                temperature REAL,
                is_weekend INTEGER,
                leak_node_id TEXT,
                severity TEXT,
                user_prompt TEXT NOT NULL,
                ai_response TEXT NOT NULL,
                model_used TEXT NOT NULL,
                structured_data TEXT
            )
        ''')
    conn.close()

def log_incident(
    user_prompt: str,
    ai_response: str,
    model_used: str,
    timestep_hour: Optional[int] = None,
    temperature: Optional[float] = None,
    is_weekend: Optional[int] = None,
    leak_node_id: Optional[str] = None,
    severity: Optional[str] = "NORMAL",
    structured_data: Optional[str] = None
) -> int:
    init_db()
    conn = get_db_connection()
    timestamp = datetime.now().isoformat()
    with conn:
        cursor = conn.execute('''
            INSERT INTO incident_logs (
                timestamp, timestep_hour, temperature, is_weekend,
                leak_node_id, severity, user_prompt, ai_response,
                model_used, structured_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            timestamp, timestep_hour, temperature, is_weekend,
            leak_node_id, severity, user_prompt, ai_response,
            model_used, structured_data
        ))
        row_id = cursor.lastrowid
    conn.close()
    return row_id

def get_recent_incidents(limit: int = 20) -> List[Dict[str, Any]]:
    init_db()
    conn = get_db_connection()
    cursor = conn.execute('''
        SELECT * FROM incident_logs ORDER BY id DESC LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
