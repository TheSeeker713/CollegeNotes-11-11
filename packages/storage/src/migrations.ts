import type Database from 'better-sqlite3';

export const MIGRATIONS = [
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
  );`,
  `alter table courses add column description text not null default '';
   alter table courses add column updated_at text not null default '';
   alter table courses add column archived_at text;
   alter table courses add column trashed_at text;
   update courses set updated_at = created_at;
   create table course_modules (course_id text not null references courses(id), module_id text not null, schema_version integer not null check(schema_version > 0), enabled integer not null check(enabled in (0,1)), primary key(course_id, module_id));
   alter table source_documents add column kind text not null default 'imported' check(kind in ('imported','note'));
   alter table source_documents add column revision integer not null default 1 check(revision > 0);
   alter table source_documents add column updated_at text not null default '';
   alter table source_documents add column trashed_at text;
   alter table source_documents add column deleted_at text;
   alter table source_documents add column cleanup_state text not null default 'none' check(cleanup_state in ('none','pending','failed','complete'));
   update source_documents set updated_at = created_at;
   create unique index source_course_identity on source_documents(id, course_id);
   create table material_revisions (source_id text not null, course_id text not null, revision integer not null check(revision > 0), text text not null, anchors text not null check(json_valid(anchors)), author text not null check(author in ('user','extraction')), created_at text not null, primary key(source_id, revision), foreign key(source_id, course_id) references source_documents(id, course_id));
   create table derivatives (id text primary key, course_id text not null, source_id text not null, source_revision integer not null check(source_revision > 0), kind text not null check(kind in ('lexical','embedding','activity','audio')), status text not null check(status in ('ready','stale')), model_version text, foreign key(source_id, course_id) references source_documents(id, course_id));
   create trigger source_invalidates_derivatives after update of revision, trashed_at, deleted_at on source_documents begin update derivatives set status='stale' where source_id=new.id; end;
   create table embedding_indexes (id text primary key, course_id text not null references courses(id), model_id text not null, model_version text not null, weights_checksum text not null, status text not null check(status in ('not_prepared','building','ready','stale','failed')), source_revisions text not null check(json_valid(source_revisions)), rebuild_reason text);
   create trigger source_invalidates_indexes after update of revision, trashed_at, deleted_at on source_documents begin update embedding_indexes set status='stale', rebuild_reason='source_changed' where course_id=new.course_id; end;
   create trigger embedding_model_invalidates after update of model_id, model_version, weights_checksum on embedding_indexes begin update embedding_indexes set status='stale', rebuild_reason='model_changed' where id=new.id; update derivatives set status='stale' where course_id=new.course_id and kind='embedding'; end;
   create table provider_definitions (id text primary key, payload text not null check(json_valid(payload)), enabled integer not null default 0 check(enabled in (0,1)));
   create table connections (id text primary key, provider_id text not null references provider_definitions(id), payload text not null check(json_valid(payload)));
   create table credential_references (connection_id text primary key references connections(id) on delete cascade, store text not null check(store='macos-keychain'), reference_id text not null unique);
   create table capability_assignments (capability text primary key check(capability in ('tutor','research','embeddings','narration','transcription','realtimeVoice')), connection_id text not null references connections(id) on delete cascade, model_id text not null);
   create table research_sessions (id text primary key, course_id text not null references courses(id), provider_id text not null, connection_id text, query text not null, created_at text not null, initiated_by text not null check(initiated_by='user'), shared_context text not null check(json_valid(shared_context)), status text not null check(status in ('draft','running','complete','cancelled','failed')), deleted_at text, unique(id, course_id));
   create table research_sources (id text primary key, session_id text not null, course_id text not null, url text not null, title text not null, publisher text, author text, retrieved_at text not null, excerpt text not null, claim_ids text not null check(json_valid(claim_ids)), conflicts text not null check(json_valid(conflicts)), uncertainty text, access text not null check(access in ('available','inaccessible')), foreign key(session_id,course_id) references research_sessions(id,course_id));
   create table lifecycle_operations (id text primary key, course_id text references courses(id), kind text not null check(kind in ('export','trash','restore','permanent_delete')), status text not null check(status in ('pending','running','failed','complete','cancelled')), manifest text not null check(json_valid(manifest)), updated_at text not null);
  `,
  `create table import_tasks (id text primary key, course_id text not null references courses(id) on delete cascade, source_id text not null references source_documents(id) on delete cascade, status text not null check(status in ('queued','running','completed','failed','cancelled')), error text, progress integer not null default 0, created_at text not null, updated_at text not null);
   create index import_tasks_course on import_tasks(course_id, status);`

];

export function migrate(db: Database.Database): number {
  return db.transaction(() => {
    db.exec('create table if not exists schema_migrations (version integer primary key, applied_at text not null);');
    const rows = db.prepare('select version from schema_migrations order by version').all() as { version: number }[];
    if (rows.some((row, i) => row.version !== i + 1) || rows.length > MIGRATIONS.length) throw new Error('unsupported_schema');
    for (let i = rows.length; i < MIGRATIONS.length; i += 1) {
      db.exec(MIGRATIONS[i]!);
      db.prepare('insert into schema_migrations(version, applied_at) values (?, ?)').run(i + 1, new Date().toISOString());
    }
    return MIGRATIONS.length;
  })();
}
