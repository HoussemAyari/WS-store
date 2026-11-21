alter table public.shops enable row level security;
alter table public.profiles enable row level security;
alter table public.catalog_categories enable row level security;
alter table public.catalog_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.submissions enable row level security;
alter table public.notifications enable row level security;

revoke all on table
  public.shops,
  public.profiles,
  public.catalog_categories,
  public.catalog_items,
  public.orders,
  public.order_items,
  public.message_threads,
  public.messages,
  public.submissions,
  public.notifications
from anon, authenticated;

grant all on table
  public.shops,
  public.profiles,
  public.catalog_categories,
  public.catalog_items,
  public.orders,
  public.order_items,
  public.message_threads,
  public.messages,
  public.submissions,
  public.notifications
to service_role;
