import { supabase } from './supabase';

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  details: string;
  price: number;
  sku: string;
  category: string;
  tags: string[];
  image_url: string;
  gallery_urls: string[];
  published: boolean;
  featured: boolean;
  stock: number;
};

export const categories = ['Shop All', 'Best Sellers', 'Party Packs', 'Sweet & Sour', 'Chocolates'];
export const allowedProductImageTypes = ['image/png', 'image/svg+xml'];

export async function listProducts(filters: { category?: string; search?: string; featured?: boolean; includeUnpublished?: boolean } = {}) {
  if (!supabase) return [] as Product[];
  let query = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (!filters.includeUnpublished) query = query.eq('published', true);
  if (filters.search) query = query.ilike('name', `%${filters.search}%`);
  if (filters.featured) query = query.eq('featured', true);
  const { data, error } = await query;
  if (error) throw error;
  const products = (data || []) as Product[];
  if (!filters.category || filters.category === 'Shop All') return products;
  const wantedCategory = filters.category.trim().toLowerCase();
  return products.filter((product) => product.category?.trim().toLowerCase() === wantedCategory || product.tags?.some((tag) => tag.trim().toLowerCase() === wantedCategory));
}

export async function getProduct(slug: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).eq('published', true).single();
  if (error) throw error;
  return data as Product;
}

export function subscribeToProducts(onChange: () => void) {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client.channel('public-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange).subscribe();
  return () => { void client.removeChannel(channel); };
}

export async function uploadProductImage(file: File) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  if (!allowedProductImageTypes.includes(file.type)) throw new Error('Solo se permiten imágenes PNG o SVG.');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const path = `${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}