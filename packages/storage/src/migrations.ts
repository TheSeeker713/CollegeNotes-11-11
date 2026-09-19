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
   create index import_tasks_course on import_tasks(course_id, status);`,
  `alter table source_documents add column approved_revision integer;
   create table semantic_chunks (
     id text primary key, course_id text not null, source_id text not null,
     source_revision integer not null, model_version text not null,
     ordinal integer not null, text text not null, start_offset integer not null, end_offset integer not null,
     anchors text not null check(json_valid(anchors)), vector text not null check(json_valid(vector)),
     foreign key(source_id, course_id) references source_documents(id, course_id) on delete cascade
   );
   create index semantic_course on semantic_chunks(course_id, source_id, source_revision);
   create virtual table material_fts using fts5(chunk_id unindexed, course_id unindexed, source_id unindexed, text);
   create trigger material_approval_invalidates after update of approved_revision on source_documents begin
     update embedding_indexes set status='stale', rebuild_reason='approval_changed' where course_id=new.course_id;
     update derivatives set status='stale' where source_id=new.id;
     delete from material_fts where source_id=new.id;
   end;
   create trigger material_content_invalidates after update of revision, trashed_at, deleted_at on source_documents begin
     delete from semantic_chunks where source_id=new.id;
     delete from material_fts where source_id=new.id;
   end;
   create trigger material_delete_fts after delete on source_documents begin
     delete from material_fts where source_id=old.id;
   end;
   create trigger model_chunks_invalidate after update of model_id,model_version,weights_checksum on embedding_indexes begin
     delete from semantic_chunks where course_id=new.course_id;
     delete from material_fts where course_id=new.course_id;
   end;` ,
  `create table reading_annotations (
    id text primary key, course_id text not null, source_id text not null, revision integer not null,
    kind text not null check(kind in ('highlight','note','bookmark')), start_offset integer not null, end_offset integer not null,
    quote text not null, note text not null, version integer not null default 1, created_at text not null, updated_at text not null,
    foreign key(source_id,course_id) references source_documents(id,course_id) on delete cascade,
    foreign key(source_id,revision) references material_revisions(source_id,revision) on delete cascade
  );
  create index reading_annotations_source on reading_annotations(course_id,source_id,revision);
  create table reading_positions (
    source_id text primary key, course_id text not null, revision integer not null, payload text not null check(json_valid(payload)), version integer not null, updated_at text not null,
    foreign key(source_id,course_id) references source_documents(id,course_id) on delete cascade,
    foreign key(source_id,revision) references material_revisions(source_id,revision) on delete cascade
  );` ,
  `alter table reading_positions rename to reading_positions_legacy;
   create table reading_positions (
    source_id text not null, course_id text not null, revision integer not null, payload text not null check(json_valid(payload)), version integer not null, updated_at text not null,
    primary key(source_id,revision),
    foreign key(source_id,course_id) references source_documents(id,course_id) on delete cascade,
    foreign key(source_id,revision) references material_revisions(source_id,revision) on delete cascade
   );
   insert into reading_positions select * from reading_positions_legacy;
   drop table reading_positions_legacy;`,
  `create table ai_preferences (id integer primary key check(id=1), onboarding_dismissed integer not null default 0, selected_connection_id text references connections(id) on delete set null); insert into ai_preferences(id) values(1);`,
  `create table research_claims (
    id text primary key, session_id text not null, course_id text not null,
    statement text not null, supported integer not null check(supported in (0,1)),
    source_ids text not null check(json_valid(source_ids)),
    foreign key(session_id, course_id) references research_sessions(id, course_id) on delete cascade
  );
  create table tutor_sessions (
    id text primary key, course_id text not null references courses(id),
    connection_id text, provider_id text,
    status text not null check(status in ('active','closed')),
    offline integer not null check(offline in (0,1)),
    unfinished_question text not null default '',
    context_json text not null check(json_valid(context_json) or context_json='null'),
    research_session_id text,
    created_at text not null, updated_at text not null,
    unique(id, course_id)
  );
  create table tutor_turns (
    id text primary key, session_id text not null, course_id text not null,
    client_request_id text not null,
    action text not null check(action in ('explain','example','hint','check_understanding')),
    request_json text not null check(json_valid(request_json)),
    response_json text not null check(json_valid(response_json)),
    created_at text not null,
    unique(session_id, client_request_id),
    foreign key(session_id, course_id) references tutor_sessions(id, course_id) on delete cascade
  );` ,
  `create table study_activities (
    id text primary key, course_id text not null references courses(id) on delete cascade,
    payload text not null check(json_valid(payload)), status text not null check(status in ('ready','stale')),
    created_at text not null, unique(id,course_id)
  );
  create table study_sources (
    activity_id text not null references study_activities(id) on delete cascade,
    source_id text not null references source_documents(id), revision integer not null,
    primary key(activity_id,source_id)
  );
  create trigger study_source_changed after update of revision,approved_revision,trashed_at,deleted_at on source_documents begin
    update study_activities set status='stale' where id in (select activity_id from study_sources where source_id=new.id);
  end;
  create trigger study_source_deleted before delete on source_documents begin
    delete from study_activities where id in (select activity_id from study_sources where source_id=old.id);
  end;` ,
  `create table study_attempts (
    id text primary key, course_id text not null, activity_id text not null,
    response text not null check(json_valid(response)), teach_back text not null default '',
    hint_count integer not null default 0, revealed integer not null default 0,
    status text not null check(status in ('draft','submitted')),
    feedback text check(feedback is null or json_valid(feedback)),
    version integer not null default 1, created_at text not null, submitted_at text,
    foreign key(activity_id,course_id) references study_activities(id,course_id) on delete cascade,
    unique(id,course_id)
  );` ,
  `create table study_schedule (
    activity_id text primary key, course_id text not null,
    due_at text not null, interval_days integer not null default 0,
    last_attempt_id text, undo_json text check(undo_json is null or json_valid(undo_json)),
    foreign key(activity_id,course_id) references study_activities(id,course_id) on delete cascade
  );
  create table study_preferences (
    course_id text primary key references courses(id) on delete cascade,
    daily_limit integer not null default 5 check(daily_limit between 1 and 50)
  );` ,
  `create table study_sessions (
    id text primary key, course_id text not null references courses(id) on delete cascade,
    activity_ids text not null check(json_valid(activity_ids)), cursor integer not null default 0,
    attempt_id text references study_attempts(id) on delete set null,
    status text not null check(status in ('active','paused','complete')),
    version integer not null default 1, created_at text not null, updated_at text not null
  );
  create unique index one_open_study_session on study_sessions(course_id) where status!='complete';`,
  `create table narration_assets (
    id text primary key,
    course_id text not null references courses(id) on delete cascade,
    source_id text not null,
    source_revision integer not null check(source_revision > 0),
    voice_id text not null,
    settings_hash text not null,
    text_hash text not null,
    rel_path text not null,
    duration_ms integer not null check(duration_ms > 0),
    byte_length integer not null check(byte_length > 0),
    anchors_json text not null check(json_valid(anchors_json)),
    provider_id text not null,
    status text not null check(status in ('ready','stale','failed')),
    created_at text not null,
    unique(course_id, source_id, source_revision, voice_id, settings_hash),
    unique(id, course_id),
    foreign key(source_id, course_id) references source_documents(id, course_id) on delete cascade
  );
  create index narration_assets_course on narration_assets(course_id, source_id, source_revision);
  create trigger narration_source_changed after update of revision,approved_revision,trashed_at,deleted_at on source_documents begin
    update narration_assets set status='stale' where source_id=new.id;
  end;
  create table narration_playback (
    course_id text not null,
    asset_id text not null,
    offset_ms integer not null default 0 check(offset_ms >= 0),
    speed real not null default 1 check(speed > 0 and speed <= 3),
    bookmarks_json text not null default '[]' check(json_valid(bookmarks_json)),
    updated_at text not null,
    primary key(course_id, asset_id),
    foreign key(asset_id, course_id) references narration_assets(id, course_id) on delete cascade
  );
  create table recognition_transcripts (
    id text primary key,
    course_id text not null references courses(id) on delete cascade,
    raw_text text not null,
    edited_text text not null,
    terms_json text not null check(json_valid(terms_json)),
    status text not null check(status in ('draft','final')),
    created_at text not null,
    updated_at text not null,
    unique(id, course_id)
  );
  create table voice_interrupt_sessions (
    id text primary key,
    course_id text not null references courses(id) on delete cascade,
    asset_id text not null,
    saved_offset_ms integer not null check(saved_offset_ms >= 0),
    tutor_request_id text,
    echo_suppressed integer not null default 1 check(echo_suppressed in (0,1)),
    status text not null check(status in ('interrupted','asking','resumed','cancelled','failed')),
    client_request_id text,
    created_at text not null,
    updated_at text not null,
    unique(id, course_id),
    unique(course_id, client_request_id),
    foreign key(asset_id, course_id) references narration_assets(id, course_id) on delete cascade
  );`
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
