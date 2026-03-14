import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath =
  process.env.DB_PATH ??
  path.join(process.cwd(), "data", "applications.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    role_title TEXT NOT NULL,
    location TEXT,
    job_link TEXT,
    source TEXT,
    date_applied TEXT NOT NULL,
    status TEXT NOT NULL,
    follow_up_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_applications_date_applied
    ON applications (date_applied);
  CREATE INDEX IF NOT EXISTS idx_applications_status
    ON applications (status);
  CREATE INDEX IF NOT EXISTS idx_applications_source
    ON applications (source);
  CREATE INDEX IF NOT EXISTS idx_applications_follow_up_date
    ON applications (follow_up_date);
  CREATE INDEX IF NOT EXISTS idx_applications_company_role
    ON applications (company, role_title);
`);
