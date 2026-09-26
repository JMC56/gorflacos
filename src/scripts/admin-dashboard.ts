import { isOwner, currentAdminEmail, endAdminSession } from '../lib/admin';
import { allowedProductImageTypes, listProducts, subscribeToOrders, subscribeToProducts, uploadProductImage, type Order, type Product } from '../lib/catalog';
import { supabase } from '../lib/supabase';

const email = currentAdminEmail();
const form = document.querySelector('#product-form') as HTMLFormElement;
const status = document.querySelector('#admin-form-status');
const productsRoot = document.querySelector('#admin-products');
const requestRoot = document.querySelector('#admin-requests');
const ordersRoot = document.querySelector('#admin-orders');
const owner = isOwner(email);
const sessionLimit = 2 * 60 * 60 * 1000;
document.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((input) => { input.accept = '.png,.svg,image/png,image/svg+xml'; });

const adminHeader = document.querySelector('main header');
const adminSections = document.querySelectorAll('main > div > section');
const adminPanels = document.querySelectorAll('main .candy-panel');
adminHeader?.classList.add('admin-entry');
adminSections.forEach((section, index) => {
  section.classList.add('scroll-reveal');
  if (index > 0) section.classList.add('scroll-reveal-delay-2');
});
adminPanels.forEach((panel, index) => {
  panel.classList.add('scroll-reveal');
  panel.classList.add(`scroll-reveal-delay-${Math.min((index % 3) + 1, 3)}`);
});
const adminRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      adminRevealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -48px' });
adminSections.forEach((section) => adminRevealObserver.observe(section));
adminPanels.forEach((panel) => adminRevealObserver.observe(panel));
requestAnimationFrame(() => {
  adminHeader?.classList.add('admin-entry');
  adminSections[0]?.classList.add('is-visible');
});

function guardSession() {
  const lastActive = Number(localStorage.getItem('gorflacos-admin-last-active') || 0);
  if (!email || !lastActive || Date.now() - lastActive > sessionLimit) { endAdminSession(); window.location.href = '/'; return; }
  localStorage.setItem('gorflacos-admin-last-active', String(Date.now()));
}
guardSession();
history.pushState(null, '', window.location.href); window.addEventListener('popstate', () => history.pushState(null, '', window.location.href));
['click', 'keydown', 'mousemove'].forEach((eventName) => document.addEventListener(eventName, () => localStorage.setItem('gorflacos-admin-last-active', String(Date.now())), { passive: true }));
function slugify(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function uniqueSlug(name: string, id: string) { const base = slugify(name); return id ? base : `${base}-${Date.now().toString(36)}`; }
function showStatus(message: string, error = false) { if (!status) return; status.textContent = message; status.className = `rounded-xl p-3 text-sm ${error ? 'bg-bubblegum/40 text-tomato' : 'bg-mint text-leaf'}`; }
function validateImage(file: File) { return !file.size || allowedProductImageTypes.includes(file.type); }

function renderProducts(items: Product[]) {
  const productsMetric = document.querySelector('#metric-products'); const stockMetric = document.querySelector('#metric-stock');
  if (productsMetric) productsMetric.textContent = String(items.length); if (stockMetric) stockMetric.textContent = String(items.reduce((sum, product) => sum + product.stock, 0));
  if (!productsRoot) return;
  productsRoot.innerHTML = items.length ? items.map((product) => `<div class="flex items-center gap-4 py-4"><img class="size-14 rounded-xl object-cover" src="${product.image_url}" alt=""/><div class="min-w-0 flex-1"><p class="truncate font-bold">${product.name}</p><p class="text-xs text-ink/55">${product.category} · C$${product.price} · ${product.stock} disponibles</p><p class="mt-1 text-xs font-bold ${product.published ? 'text-leaf' : 'text-tomato'}">${product.published ? 'Disponible en tienda' : 'No disponible'}</p></div><button class="edit-product grid size-9 place-items-center rounded-full border" data-id="${product.id}" type="button" aria-label="Editar"><i class="fi fi-rr-pencil"></i></button><button class="delete-product grid size-9 place-items-center rounded-full border text-tomato" data-id="${product.id}" type="button" aria-label="Eliminar"><i class="fi fi-rr-trash"></i></button></div>`).join('') : '<p class="py-10 text-center text-sm text-ink/55">No hay productos registrados.</p>';
}

const orderLabels: Record<string, string> = { received: 'Recibido', preparing: 'Preparándose', on_the_way: 'En camino', delivered: 'Entregado' };
const nextStatus: Record<string, string> = { received: 'preparing', preparing: 'on_the_way', on_the_way: 'delivered' };
async function refreshOrders() { if (!supabase || !ordersRoot) return; const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }); if (error) { showStatus(error.message, true); return; } const orders = (data || []) as Order[]; const metric = document.querySelector('#metric-requests'); if (metric) metric.textContent = String(orders.length); ordersRoot.innerHTML = orders.length ? orders.map((order) => `<article class="rounded-2xl border border-ink/10 p-5 ${order.status === 'delivered' ? 'bg-ink/5 opacity-60' : 'bg-white'}"><div class="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p class="font-display text-xl font-bold">${order.student_name} · ${order.grade}</p><p class="mt-1 text-sm text-ink/60">Entrega: ${order.delivery_place} · Total: C$${order.total}</p><div class="mt-3 text-sm">${order.items.map((item) => `<p>${item.quantity} × ${item.name} · C$${item.price}</p>`).join('')}</div></div><div class="text-left md:text-right"><span class="inline-flex rounded-full bg-bubblegum/40 px-4 py-2 text-sm font-bold">${orderLabels[order.status]}</span>${order.status !== 'delivered' ? `<button class="order-status-button candy-button-pink mt-3 w-full py-2" data-order-id="${order.id}" data-next-status="${nextStatus[order.status]}">${nextStatus[order.status] === 'preparing' ? 'Marcar preparándose' : nextStatus[order.status] === 'on_the_way' ? 'Marcar en camino' : 'Marcar entregado'}</button>` : '<p class="mt-3 text-xs font-bold text-ink/50">Pedido cerrado</p>'}</div></div></article>`).join('') : '<p class="rounded-2xl border border-dashed border-ink/15 p-10 text-center text-sm text-ink/55">No hay solicitudes de compra.</p>'; }

async function refresh() { try { renderProducts(await listProducts({ includeUnpublished: true })); } catch (error) { showStatus((error as Error).message, true); } }
function fillForm(product: Product) { Object.entries({ id: product.id, name: product.name, price: product.price, category: product.category, description: product.description, details: product.details, sku: product.sku, stock: product.stock }).forEach(([key, value]) => { const field = form.elements.namedItem(key) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement; if (field) field.value = String(value); }); (form.elements.namedItem('published') as HTMLInputElement).checked = product.published; (form.elements.namedItem('image') as HTMLInputElement).required = false; (form.elements.namedItem('image2') as HTMLInputElement).required = false; (form.elements.namedItem('image3') as HTMLInputElement).required = false; (document.querySelector('#cancel-edit') as HTMLElement)?.classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); }

form?.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!supabase) { showStatus('Configura Supabase antes de guardar productos.', true); return; }
  const data = new FormData(form); const id = String(data.get('id') || ''); const image = data.get('image') as File; const image2 = data.get('image2') as File; const image3 = data.get('image3') as File; const payload: Record<string, unknown> = { name: data.get('name'), slug: uniqueSlug(String(data.get('name')), id), price: Number(data.get('price')), category: data.get('category'), tags: [data.get('category')], description: data.get('description'), details: data.get('details'), sku: data.get('sku'), stock: Number(data.get('stock')), published: data.get('published') === 'on', updated_at: new Date().toISOString() };
  try { if (![image, image2, image3].every(validateImage)) throw new Error('Solo se permiten imágenes PNG o SVG.'); if (image?.size) payload.image_url = await uploadProductImage(image); const gallery = [image2, image3].filter((file) => file?.size); if (gallery.length) payload.gallery_urls = await Promise.all(gallery.map((file) => uploadProductImage(file))); if (owner) { const result = id ? await supabase.from('products').update(payload).select().single() : await supabase.from('products').insert(payload).select().single(); if (result.error || !result.data) throw result.error || new Error('Supabase no devolvió el producto guardado.'); showStatus(id ? 'Producto actualizado.' : 'Producto registrado.'); } else { const request = await supabase.from('product_requests').insert({ action: id ? 'update' : 'create', product_id: id || null, payload, requested_by: email }).select().single(); if (request.error || !request.data) throw request.error || new Error('No se pudo registrar la solicitud.'); showStatus('Solicitud enviada al owner para aprobación.'); } form.reset(); const availability = form.elements.namedItem('published') as HTMLInputElement; availability.checked = true; await refresh(); } catch (error) { showStatus((error as Error).message, true); }
});

productsRoot?.addEventListener('click', async (event) => { const target = event.target as HTMLElement; const id = target.closest<HTMLElement>('[data-id]')?.dataset.id; if (!id || !supabase) return; const items = await listProducts({ includeUnpublished: true }); const product = items.find((item) => item.id === id); if (target.closest('.edit-product') && product) fillForm(product); if (target.closest('.delete-product')) { if (owner) { const result = await supabase.from('products').delete().eq('id', id); if (result.error) showStatus(result.error.message, true); else await refresh(); } else { await supabase.from('product_requests').insert({ action: 'delete', product_id: id, payload: {}, requested_by: email }); showStatus('Solicitud de eliminación enviada al owner.'); } } });
ordersRoot?.addEventListener('click', async (event) => { const target = event.target as HTMLElement; const button = target.closest<HTMLButtonElement>('.order-status-button'); if (!button || !supabase) return; const result = await supabase.from('orders').update({ status: button.dataset.nextStatus, updated_at: new Date().toISOString() }).eq('id', button.dataset.orderId); if (result.error) showStatus(result.error.message, true); else await refreshOrders(); });

async function loadRequests() { if (!owner || !supabase || !requestRoot) return; const { data, error } = await supabase.from('product_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }); if (error) return; const requests = data || []; const metric = document.querySelector('#metric-requests'); if (metric) metric.textContent = String(requests.length); requestRoot.innerHTML = requests.length ? `<h3 class="font-display text-2xl font-bold">Solicitudes del equipo</h3>${requests.map((request) => `<div class="mt-4 rounded-2xl bg-bubblegum/20 p-4"><p class="text-sm font-bold">${request.action} · ${request.requested_by}</p><div class="mt-3 flex gap-2"><button class="approve-request candy-button-pink py-2" data-request="${request.id}" type="button">Aprobar</button><button class="reject-request candy-button py-2" data-request="${request.id}" type="button">Rechazar</button></div></div>`).join('')}` : '<p class="mt-8 text-sm text-ink/55">No hay solicitudes pendientes.</p>'; }
requestRoot?.addEventListener('click', async (event) => { const target = event.target as HTMLElement; const id = target.closest<HTMLElement>('[data-request]')?.dataset.request; if (!id || !supabase) return; const request = await supabase.from('product_requests').select('*').eq('id', id).single(); if (request.error) return; if (target.closest('.approve-request')) { if (request.data.action === 'create') await supabase.from('products').insert(request.data.payload); if (request.data.action === 'update') await supabase.from('products').update(request.data.payload).eq('id', request.data.product_id); if (request.data.action === 'delete') await supabase.from('products').delete().eq('id', request.data.product_id); } await supabase.from('product_requests').update({ status: target.closest('.approve-request') ? 'approved' : 'rejected' }).eq('id', id); await loadRequests(); await refresh(); });
document.querySelector('#refresh-products')?.addEventListener('click', () => { void refresh(); void loadRequests(); void refreshOrders(); });
subscribeToProducts(() => { void refresh(); }); subscribeToOrders(() => { void refreshOrders(); }); void refresh(); void loadRequests(); void refreshOrders();