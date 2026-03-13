begin;

create table if not exists causelaw_yinguo_v1.external_identities (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references causelaw_yinguo_v1.members(id) on delete cascade,
  provider text not null check (provider in ('line')),
  provider_user_id text not null,
  provider_email text,
  provider_display_name text,
  provider_avatar_url text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_user_id)
);

create index if not exists idx_yinguo_external_identities_member
  on causelaw_yinguo_v1.external_identities(member_id);

create index if not exists idx_yinguo_external_identities_provider_email
  on causelaw_yinguo_v1.external_identities(provider, provider_email);

drop trigger if exists trg_yinguo_external_identities_updated_at on causelaw_yinguo_v1.external_identities;
create trigger trg_yinguo_external_identities_updated_at
before update on causelaw_yinguo_v1.external_identities
for each row execute function causelaw_yinguo_v1.set_updated_at();

alter table causelaw_yinguo_v1.external_identities enable row level security;

revoke all on causelaw_yinguo_v1.external_identities from public;
revoke all on causelaw_yinguo_v1.external_identities from anon;
revoke all on causelaw_yinguo_v1.external_identities from authenticated;
grant select, insert, update, delete on causelaw_yinguo_v1.external_identities to service_role;

commit;
