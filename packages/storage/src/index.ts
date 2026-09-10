import Database from 'better-sqlite3';

export type SqliteProbe = { sqlite: 'ok'; fts5: boolean; version: string };

export function probeSqlite(file = ':memory:'): SqliteProbe {
  const db = new Database(file);
  try {
    db.pragma('compile_options');
    const row = db.prepare("select sqlite_version() as v").get() as { v: string };
    let fts5 = false;
    try {
      db.exec('create virtual table if not exists cn_fts_probe using fts5(body)');
      db.exec("insert into cn_fts_probe(body) values ('college notes')");
      const hit = db.prepare("select count(*) as n from cn_fts_probe where body match 'college'").get() as { n: number };
      fts5 = hit.n === 1;
    } catch {
      fts5 = false;
    }
    return { sqlite: 'ok', fts5, version: row.v };
  } finally {
    db.close();
  }
}
