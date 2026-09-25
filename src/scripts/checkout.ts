import { createOrder, listProducts } from '../lib/catalog';
import { supabase } from '../lib/supabase';

const modal = document.querySelector('#checkout-modal');
const form = document.querySelector('#checkout-form') as HTMLFormElement | null;
const cartKey = 'candy-cart';

document.querySelector('#close-checkout')?.addEventListener('click', () => modal?.classList.add('hidden'));
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!(event.currentTarget instanceof HTMLFormElement)) return;
  const cart: Array<{ productId: string; quantity: number }> = JSON.parse(localStorage.getItem(cartKey) || '[]');
  const products = await listProducts();
  const items = cart.map((line) => { const product = products.find((item) => item.id === line.productId); return product ? { productId: product.id, name: product.name, quantity: line.quantity, price: product.price, image_url: product.image_url } : null; }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!items.length) { alert('Tu carrito está vacío.'); return; }
  const data = new FormData(event.currentTarget);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await createOrder({ student_name: String(data.get('student')), grade: String(data.get('grade')), delivery_place: String(data.get('place')), items, total, status: 'received' });
  const client = supabase;
  if (client) await Promise.all(items.map(async (item) => { const product = products.find((candidate) => candidate.id === item.productId); if (product) await client.from('products').update({ stock: Math.max(0, product.stock - item.quantity) }).eq('id', item.productId); }));
  localStorage.removeItem(cartKey);
  localStorage.setItem('gorflacos-order', JSON.stringify({ id: order.id, status: order.status }));
  window.location.href = '/?pedido=registrado';
});