export const SCHEMA = `
CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  age INTEGER NOT NULL,
  blood_type TEXT NOT NULL,
  city TEXT NOT NULL,
  smoker INTEGER NOT NULL DEFAULT 0,
  donated_before INTEGER NOT NULL DEFAULT 0,
  last_donation TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','opted_out')),
  paused_until TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_donors_match ON donors (blood_type, verified, status);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
  blood_type TEXT NOT NULL,
  include_compatible INTEGER NOT NULL DEFAULT 1,
  component TEXT NOT NULL,
  units INTEGER NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('urgent','24h','week')),
  patient_ref TEXT,
  note TEXT,
  radius_km INTEGER NOT NULL,
  min_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','expired')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_hospital ON requests (hospital_id, status);

CREATE TABLE IF NOT EXISTS request_donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  donor_id INTEGER NOT NULL REFERENCES donors(id),
  distance_km REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','confirmed','enroute','donated','later','declined','paused','failed')),
  eta TEXT,
  sent_at TEXT NOT NULL,
  replied_at TEXT,
  wa_message_id TEXT,
  reception_code TEXT,
  UNIQUE (request_id, donor_id)
);
CREATE INDEX IF NOT EXISTS idx_rd_donor ON request_donors (donor_id);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  flag TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_request ON events (request_id, created_at);

CREATE TABLE IF NOT EXISTS message_templates (
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (hospital_id, key)
);

CREATE TABLE IF NOT EXISTS drives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  location TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  capacity INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drives_hospital ON drives (hospital_id, starts_at);

CREATE TABLE IF NOT EXISTS drive_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  drive_id INTEGER NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
  donor_id INTEGER NOT NULL REFERENCES donors(id),
  distance_km REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','going','declined','failed')),
  sent_at TEXT NOT NULL,
  replied_at TEXT,
  UNIQUE (drive_id, donor_id)
);
CREATE INDEX IF NOT EXISTS idx_invites_donor ON drive_invites (donor_id);
`

/**
 * Columns added after the first release. Applied on start when missing,
 * so databases created by an older version keep working.
 */
export const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ['hospitals', 'phone', 'TEXT'],
  ['hospitals', 'address', 'TEXT'],
  ['hospitals', 'default_radius_km', 'INTEGER NOT NULL DEFAULT 20'],
  ['hospitals', 'default_min_days', 'INTEGER NOT NULL DEFAULT 56'],
  // Bumped on password change so tokens issued before it stop working.
  ['hospitals', 'token_version', 'INTEGER NOT NULL DEFAULT 0'],
]

/** Statuses that mean the donor said yes (or is already on the way). */
export const POSITIVE = ['confirmed', 'enroute', 'donated', 'later'] as const
/** Statuses where the donor confirmed, so the hospital may see the full contact details. */
export const REVEALED = ['confirmed', 'enroute', 'donated', 'later'] as const
