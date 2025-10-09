-- Add note folders table
create table if not exists note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

-- Add folder_id column to notes
alter table notes
  add column if not exists folder_id uuid references note_folders(id) on delete set null;

-- Create index for folder lookup
create index if not exists notes_folder_id_idx on notes(folder_id);
create index if not exists note_folders_user_id_idx on note_folders(user_id);
