'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { POSITIONS } = require('./config');

const positionCheck = POSITIONS.map((p) => `'${p.replace(/'/g, "''")}'`).join(', ');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS applications (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name          TEXT    NOT NULL,
  email              TEXT    NOT NULL,
  phone              TEXT    NOT NULL,
  city               TEXT    NOT NULL,
  years_experience   INTEGER NOT NULL CHECK (years_experience >= 0),
  salary_expectation TEXT,
  cv_filename        TEXT    NOT NULL,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS application_positions (
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  position       TEXT    NOT NULL CHECK (position IN (${positionCheck})),
  PRIMARY KEY (application_id, position)
);

CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_positions_position ON application_positions(position);
`;

// Columnas agregadas después del esquema original. Nulas para no romper las filas existentes.
const NEW_COLUMNS = {
  document_type: 'TEXT',
  document_number: 'TEXT',
  education_level: 'TEXT',
  consent_accepted_at: 'TEXT',
  consent_text: 'TEXT',
};

function addMissingColumns(db) {
  const existing = new Set(db.prepare('PRAGMA table_info(applications)').all().map((c) => c.name));
  for (const [name, type] of Object.entries(NEW_COLUMNS)) {
    if (!existing.has(name)) db.exec(`ALTER TABLE applications ADD COLUMN ${name} ${type}`);
  }
}
/** Abre (o crea) la base de datos y aplica el esquema idempotente. */
function createDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  addMissingColumns(db);
  return db;
}

module.exports = { createDb };
