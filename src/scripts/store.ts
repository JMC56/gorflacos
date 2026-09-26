import { listProducts, subscribeToProducts, type Product } from '../lib/catalog';
import { supabase } from '../lib/supabase';

type CartLine = { productId: string; quantity: number };
const cart: CartLine[] = JSON.parse(localStorage.getItem('candy-cart') || '[]');
const cartCount = document.querySelector('#cart-count');
const cartItems = document.querySelector('#cart-items');
const cartTotal = document.querySelector('#cart-total');
const drawer = document.querySelector('#cart-drawer');
const backdrop = document.querySelector('#cart-backdrop');
const checkoutModal = document.querySelector('#checkout-modal');

function saveCart() { localStorage.setItem('candy-cart', JSON.stringify(cart)); }
function formatPrice(value: number) { return `C$${value}`; }
let products: Product[] = [];
let productsPromise: Promise<Product[]> | null = null;
function lineTotal() { return cart.reduce((sum, line) => sum + (products.find((item) => item.id === line.productId)?.price || 0) * line.quantity, 0); }
function reconcileCart() {
  let changed = false;
  for (let index = cart.length - 1; index >= 0; index -= 1) {
    const line = cart[index];
    const product = products.find((item) => item.id === line.productId);
    if (!product || product.stock <= 0) {
      cart.splice(index, 1);
      changed = true;
    } else if (line.quantity > product.stock) {
      line.quantity = product.stock;
      changed = true;
    }
  }
  if (changed) saveCart();
}
function applyProducts(data: Product[]) {
  products = data;
  reconcileCart();
  renderCart();
}
function loadProducts() {
  if (!productsPromise) {
    productsPromise = listProducts().then((data) => { if (supabase) applyProducts(data); return data; }).catch((error) => { productsPromise = null; throw error; });
  }
  return productsPromise;
}
function refreshProducts() {
  if (!supabase) return;
  void listProducts().then(applyProducts).catch((error) => console.error('No se pudo sincronizar el carrito con el catálogo.', error));
}
function updateCart(productId: string, quantity: number) {
  const product = products.find((item) => item.id === productId);
  if (product && quantity > product.stock) quantity = product.stock;
  const line = cart.find((item) => item.productId === productId);
  if (line) line.quantity = Math.max(0, quantity); else if (quantity > 0) cart.push({ productId, quantity });
  for (let index = cart.length - 1; index >= 0; index -= 1) if (cart[index].quantity === 0) cart.splice(index, 1);
  saveCart(); renderCart();
}
function renderCart() {
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  if (cartCount) cartCount.textContent = String(count);
  if (cartTotal) cartTotal.textContent = formatPrice(lineTotal());
  if (cartItems) cartItems.innerHTML = cart.length ? cart.map((line) => { const product = products.find((item) => item.id === line.productId); if (!product) return ''; return `<div class="mb-5 flex gap-4"><img class="size-16 rounded-xl object-cover" src="${product.image_url}" alt="" /><div class="min-w-0 flex-1"><div class="flex justify-between gap-2"><p class="truncate font-bold">${product.name}</p><button class="remove-item text-ink/40 hover:text-candy" data-remove="${product.id}" type="button" aria-label="Quitar">×</button></div><p class="text-sm text-ink/60">${formatPrice(product.price)}</p><div class="mt-2 flex items-center gap-3"><button class="cart-minus grid size-7 place-items-center rounded-full border" data-id="${product.id}" type="button">−</button><span class="text-sm font-bold">${line.quantity}</span><button class="cart-plus grid size-7 place-items-center rounded-full border" data-id="${product.id}" type="button">+</button></div></div></div>`; }).join('') : '<p class="text-sm text-ink/60">Tu carrito está esperando un antojo dulce.</p>';
}
function openCart(open: boolean) { drawer?.classList.toggle('translate-x-full', !open); backdrop?.classList.toggle('hidden', !open); drawer?.setAttribute('aria-hidden', String(!open)); }

document.addEventListener('click', async (event) => { const target = event.target as HTMLElement; const addButton = target.closest<HTMLButtonElement>('.add-product'); if (!addButton) return; const productId = addButton.dataset.productId || ''; addButton.disabled = true; try { if (!products.some((product) => product.id === productId)) await loadProducts(); if (!products.some((product) => product.id === productId)) throw new Error('No encontramos ese producto. Actualiza la tienda e inténtalo de nuevo.'); updateCart(productId, Number((addButton.parentElement?.querySelector('.quantity-value') as HTMLElement)?.textContent || 1)); } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo añadir el producto.'); } finally { addButton.disabled = false; } });
document.querySelectorAll<HTMLButtonElement>('.quantity-plus').forEach((button) => button.addEventListener('click', () => { const value = button.parentElement?.querySelector('.quantity-value'); if (value) value.textContent = String(Number(value.textContent) + 1); }));
document.querySelectorAll<HTMLButtonElement>('.quantity-minus').forEach((button) => button.addEventListener('click', () => { const value = button.parentElement?.querySelector('.quantity-value'); if (value) value.textContent = String(Math.max(1, Number(value.textContent) - 1)); }));
document.querySelectorAll<HTMLButtonElement>('.filter-button').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.filter-button').forEach((item) => item.classList.remove('bg-ink', 'text-white')); button.classList.add('bg-ink', 'text-white'); document.querySelectorAll<HTMLElement>('.product-card').forEach((card) => card.classList.toggle('hidden', button.dataset.filter !== 'Shop All' && card.dataset.category !== button.dataset.filter)); }));
cartItems?.addEventListener('click', (event) => { const target = event.target as HTMLElement; const id = target.dataset.id || target.dataset.remove; const line = cart.find((item) => item.productId === id); if (target.classList.contains('cart-plus') && line) updateCart(id || '', line.quantity + 1); if (target.classList.contains('cart-minus') && line) updateCart(id || '', line.quantity - 1); if (target.dataset.remove && id) updateCart(id, 0); });
document.querySelector('#open-cart')?.addEventListener('click', () => openCart(true)); document.querySelector('#close-cart')?.addEventListener('click', () => openCart(false)); backdrop?.addEventListener('click', () => openCart(false));
document.querySelector('#checkout')?.addEventListener('click', () => { if (!cart.length) { alert('Añade un producto antes de continuar.'); return; } checkoutModal?.classList.remove('hidden'); checkoutModal?.classList.add('flex'); openCart(false); });
document.addEventListener('catalog:updated', () => renderCart());
subscribeToProducts(refreshProducts);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshProducts(); });
void loadProducts().catch((error) => console.error('No se pudo cargar el catálogo para el carrito.', error));