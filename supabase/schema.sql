create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'promoter')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.app_users(id) on delete cascade,
  campaign text not null,
  platform text not null,
  post_url text not null,
  published_at date not null,
  caption text not null default '',
  notes text not null default '',
  admin_note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.app_sessions (
  token text primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at bigint not null
);

create index if not exists app_users_role_idx on public.app_users(role);
create index if not exists posts_promoter_id_idx on public.posts(promoter_id);
create index if not exists posts_status_idx on public.posts(status);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists app_sessions_user_id_idx on public.app_sessions(user_id);
create index if not exists app_sessions_expires_at_idx on public.app_sessions(expires_at);

alter table public.app_users enable row level security;
alter table public.posts enable row level security;
alter table public.app_sessions enable row level security;

insert into public.app_users (id, name, email, password_hash, role, active, created_at)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Administrador',
    'admin@sistema.com',
    'seed-admin:fc0e6b4b6246baea40d0655b4d2557623695a20f1198571affbc99d0080f2b2f',
    'admin',
    true,
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Ana Promoter',
    'ana@promoter.com',
    'seed-ana:a30ba15081b069f36b062347b5bb288058a3b97ae7787ce20e5f9527d7b29871',
    'promoter',
    true,
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Bruno Promoter',
    'bruno@promoter.com',
    'seed-bruno:5dcf79beaf800e2c9f4b6ce7fea3352e8d42bea00f30528455540ab81de19eb7',
    'promoter',
    true,
    now()
  )
on conflict (email) do nothing;

insert into public.posts (
  id,
  promoter_id,
  campaign,
  platform,
  post_url,
  published_at,
  caption,
  notes,
  admin_note,
  status,
  created_at,
  verified_at,
  verified_by
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000002',
    'Divulgacao fim de semana',
    'Instagram',
    'https://instagram.com/p/exemplo-ana',
    current_date,
    'Post no feed com chamada para a lista.',
    'Aguardando print do alcance.',
    '',
    'pending',
    now(),
    null,
    null
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000002',
    'Stories VIP',
    'Instagram',
    'https://instagram.com/stories/exemplo-ana',
    current_date - 1,
    'Sequencia de stories com marcacao do evento.',
    'Link e marcacao conferidos.',
    'Post aprovado, marcacao correta.',
    'approved',
    now() - interval '2 days',
    now() - interval '1 day',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000003',
    'Chamada TikTok',
    'TikTok',
    'https://tiktok.com/@bruno/video/exemplo',
    current_date - 1,
    'Video curto chamando para o evento.',
    'Conferir se o perfil esta publico.',
    '',
    'pending',
    now() - interval '1 day',
    null,
    null
  )
on conflict (id) do nothing;
