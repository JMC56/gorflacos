create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text not null default '',
  details text not null default '',
  price numeric(10,2) not null check (price >= 0),
  sku text unique not null,
  category text not null,
  tags text[] not null default '{}',
  image_url text not null,
  gallery_urls text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_requests (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('create', 'update', 'delete')),
  product_id uuid references public.products(id) on delete set null,
  payload jsonb not null default '{}',
  requested_by text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  grade text not null,
  delivery_place text not null,
  items jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  status text not null default 'received' check (status in ('received', 'preparing', 'on_the_way', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.product_requests enable row level security;
alter table public.orders enable row level security;

drop policy if exists "published products are public" on public.products;
drop policy if exists "admin requests can be submitted" on public.product_requests;
drop policy if exists "requests can be read by the app" on public.product_requests;
drop policy if exists "admin products can be created" on public.products;
drop policy if exists "admin products can be updated" on public.products;
drop policy if exists "admin products can be deleted" on public.products;
drop policy if exists "orders can be created" on public.orders;
drop policy if exists "orders can be read" on public.orders;
drop policy if exists "orders can be updated" on public.orders;

create policy "published products are public" on public.products for select using (published = true);
create policy "admin requests can be submitted" on public.product_requests for insert with check (true);
create policy "requests can be read by the app" on public.product_requests for select using (true);
create policy "admin products can be created" on public.products for insert with check (true);
create policy "admin products can be updated" on public.products for update using (true) with check (true);
create policy "admin products can be deleted" on public.products for delete using (true);
create policy "orders can be created" on public.orders for insert with check (true);
create policy "orders can be read" on public.orders for select using (true);
create policy "orders can be updated" on public.orders for update using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication publication
    join pg_publication_rel relation on relation.prpubid = publication.oid
    join pg_class table_ref on table_ref.oid = relation.prrelid
    join pg_namespace schema_ref on schema_ref.oid = table_ref.relnamespace
    where publication.pubname = 'supabase_realtime'
      and schema_ref.nspname = 'public'
      and table_ref.relname = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel relation
    join pg_class table_ref on table_ref.oid = relation.prrelid
    join pg_namespace schema_ref on schema_ref.oid = table_ref.relnamespace
    join pg_publication publication on publication.oid = relation.prpubid
    where publication.pubname = 'supabase_realtime'
      and schema_ref.nspname = 'public'
      and table_ref.relname = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;

-- Create a public bucket named product-images in Storage and enable public read access.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public product image reads" on storage.objects;
drop policy if exists "product image uploads" on storage.objects;
drop policy if exists "product image updates" on storage.objects;
drop policy if exists "product image deletes" on storage.objects;

create policy "public product image reads" on storage.objects for select using (bucket_id = 'product-images');
create policy "product image uploads" on storage.objects for insert with check (bucket_id = 'product-images');
create policy "product image updates" on storage.objects for update using (bucket_id = 'product-images') with check (bucket_id = 'product-images');
create policy "product image deletes" on storage.objects for delete using (bucket_id = 'product-images');