import type Database from 'better-sqlite3';

const MIGRATIONS = [
  `create table if not exists schema_migrations (version integer primary key, applied_at text not null);`,
  `create table if not exists courses (
    id text primary key,
    name text not null,
    created_at text not null
  );`,
  `create table if not exists source_documents (
    id text primary key,
    course_id text not null,
    filename text not null,
    checksum text not null,
    byte_length integer not null,
    stored_rel_path text not null,
    created_at text not null,
    foreign key(course_id) references courses(id)
  );`,
  `create table if not exists appearance (
    id integer primary key check (id = 1),
    payload text not null
  );`,
  `create table if not exists card_layouts (
    course_id text primary key,
    payload text not null,
    foreign key(course_id) references courses(id)
  );`,
  `create table if not exists sessions (
    id integer primary key check (id = 1),
    payload text not null
  );`,
  `create table if not exists drafts (
    key text primary key,
    course_id text,
    body text not null,
    updated_at text not null
  );`,
  `create table if not exists jobs (
    id text primary key,
    kind text not null,
    course_id text not null,
    fingerprint text not null,
    status text not null,
    progress integer not null,
    error text,
    source_id text,
    created_at text not null,
    updated_at text not null
  );`
];

export function migrate(db: Database.Database): number {
  db.exec('create table if not exists schema_migrations (version integer primary key, applied_at text not null);');
  const row = db.prepare('select max(version) as v from schema_migrations').get() as { v: number | null };
  let version = row.v ?? 0;
  for (let i = version; i < MIGRATIONS.length; i += 1) {
    const sql = MIGRATIONS[i];
    if (!sql) continue;
    db.exec(sql);
    db.prepare('insert or ignore into schema_migrations(version, applied_at) values (?, ?)').run(i + 1, new Date().toISOString());
    version = i + 1;
  }
  return version;
}
