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
  stock: number;
};

export type OrderStatus = 'received' | 'preparing' | 'on_the_way' | 'delivered';
export type Order = {
  id: string;
  student_name: string;
  grade: string;
  delivery_place: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number; image_url: string }>;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

export const categories = ['Shop All', 'Best Sellers', 'Party Packs', 'Sweet & Sour', 'Chocolates'];
export const allowedProductImageTypes = ['image/png', 'image/svg+xml'];

export async function listProducts(filters: { category?: string; search?: string; includeUnpublished?: boolean } = {}) {
  if (!supabase) return [] as Product[];
  let query = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (!filters.includeUnpublished) query = query.eq('published', true);
  if (filters.search) query = query.ilike('name', `%${filters.search}%`);
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
  const channel = client.channel(`public-products-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange).subscribe();
  return () => { void client.removeChannel(channel); };
}

export function subscribeToOrders(onChange: () => void) {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client.channel(`public-orders-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange).subscribe();
  return () => { void client.removeChannel(channel); };
}

export async function createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.from('orders').insert(order).select().single();
  if (error || !data) throw error || new Error('No se pudo registrar el pedido.');
  return data as Order;
}

export async function uploadProductImage(file: File) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  if (!allowedProductImageTypes.includes(file.type)) throw new Error('Solo se permiten imágenes PNG o SVG.');
  const bitmap = await createImageBitmap(file);
  let squareImage: Blob;
  try {
    const size = Math.min(bitmap.width, bitmap.height, 1200);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar el recorte de la imagen.');
    const cropX = (bitmap.width - size) / 2;
    const cropY = (bitmap.height - size) / 2;
    context.drawImage(bitmap, cropX, cropY, size, size, 0, 0, size, size);
    squareImage = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo convertir la imagen cuadrada.')), 'image/png');
    });
  } finally {
    bitmap.close();
  }
  const safeName = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const path = `${crypto.randomUUID()}-${safeName || 'product-image'}.png`;
  const { error } = await supabase.storage.from('product-images').upload(path, squareImage, { upsert: false, contentType: 'image/png' });
  if (error) throw error;
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}