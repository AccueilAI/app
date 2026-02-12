create table waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  language text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (no policies — only service_role key can access)
alter table waitlist enable row level security;
