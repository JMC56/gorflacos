import { createOrder, listProducts } from '../lib/catalog';
import { supabase } from '../lib/supabase';

const modal = document.querySelector('#checkout-modal');
const form = document.querySelector('#checkout-form') as HTMLFormElement | null;
const cartKey = 'candy-cart';
const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]') || null;
const formStatus = document.createElement('p');
formStatus.className = 'hidden text-sm text-tomato';
formStatus.setAttribute('role', 'alert');
formStatus.setAttribute('aria-live', 'polite');
submitButton?.before(formStatus);

document.querySelector('#close-checkout')?.addEventListener('click', () => { modal?.classList.add('hidden'); modal?.classList.remove('flex'); });
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!(event.currentTarget instanceof HTMLFormElement)) return;
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Enviando pedido...'; }
  formStatus.textContent = '';
  formStatus.classList.add('hidden');
  try {
    const client = supabase;
    if (!client) throw new Error('La tienda no está conectada con Supabase. Inténtalo más tarde.');
    const cart: Array<{ productId: string; quantity: number }> = JSON.parse(localStorage.getItem(cartKey) || '[]');
    if (!cart.length) throw new Error('Tu carrito está vacío. Añade un producto antes de continuar.');
    const products = await listProducts();
    const items = cart.map((line) => { const product = products.find((item) => item.id === line.productId); return product ? { productId: product.id, name: product.name, quantity: line.quantity, price: product.price, image_url: product.image_url } : null; }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (items.length !== cart.length) throw new Error('No encontramos todos los productos del carrito. Actualiza la tienda e inténtalo de nuevo.');
    if (items.some((item) => item.quantity < 1 || item.quantity > (products.find((product) => product.id === item.productId)?.stock || 0))) throw new Error('La cantidad de un producto supera las unidades disponibles. Actualiza el carrito.');
    const data = new FormData(event.currentTarget);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await createOrder({ student_name: String(data.get('student')), grade: String(data.get('grade')), delivery_place: String(data.get('place')), items, total, status: 'received' });
    await Promise.all(items.map(async (item) => { const product = products.find((candidate) => candidate.id === item.productId); if (product) await client.from('products').update({ stock: Math.max(0, product.stock - item.quantity) }).eq('id', item.productId); }));
    localStorage.removeItem(cartKey);
    localStorage.setItem('gorflacos-order', JSON.stringify({ id: order.id, status: order.status }));
    window.location.href = '/?pedido=registrado';
  } catch (error) {
    formStatus.textContent = error instanceof Error ? error.message : 'No se pudo registrar el pedido. Inténtalo de nuevo.';
    formStatus.classList.remove('hidden');
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Realizar pedido'; }
  }
});