create extension if not exists pgcrypto;

create type app_role as enum ('shop','depot');
create type order_status as enum ('nouvelle','en_preparation','expediee','recue');
create type submission_type as enum ('note','recommandation','produit_client','produit_stock');
create type submission_status as enum ('nouveau','en_cours','traite');

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete set null,
  role app_role not null,
  login text not null unique,
  password_hash text not null,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position integer not null default 0,
  active boolean not null default true
);

create table catalog_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references catalog_categories(id) on delete set null,
  name text not null unique,
  unit text not null default 'selection',
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  order_date date not null default current_date,
  status order_status not null default 'nouvelle',
  general_note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, order_date)
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_id uuid not null references catalog_items(id),
  quantity integer not null default 1,
  urgent boolean not null default false,
  item_note text,
  unavailable boolean not null default false,
  unavailable_note text
);

create table message_threads (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  order_id uuid references orders(id),
  subject text,
  unread_shop boolean not null default false,
  unread_depot boolean not null default false,
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_profile_id uuid references profiles(id),
  sender_role app_role not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  submitted_by uuid references profiles(id),
  type submission_type not null,
  description text not null,
  customer_name text,
  photo_url text,
  status submission_status not null default 'nouveau',
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_role app_role not null,
  recipient_shop_id uuid references shops(id),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index orders_shop_date_idx on orders(shop_id, order_date);
create index order_items_order_idx on order_items(order_id);
create index messages_thread_idx on messages(thread_id);
create index submissions_shop_idx on submissions(shop_id);

alter table shops enable row level security;
alter table profiles enable row level security;
alter table catalog_categories enable row level security;
alter table catalog_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table message_threads enable row level security;
alter table messages enable row level security;
alter table submissions enable row level security;
alter table notifications enable row level security;
