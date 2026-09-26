import { getProduct, listProducts, subscribeToProducts, type Product } from '../lib/catalog';

const root = document.querySelector('#product-detail');
const slug = new URLSearchParams(window.location.search).get('slug');

function relatedCard(product: Product) {
  return `<a class="group overflow-hidden rounded-[2rem] border border-ink/10 bg-white" href="/product?slug=${encodeURIComponent(product.slug)}"><img class="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" src="${product.image_url}" alt="${product.name}"/><div class="p-5"><p class="font-display text-xl font-bold">${product.name}</p><p class="mt-2 font-bold">C$${product.price}</p></div></a>`;
}

async function render() {
  if (!root || !slug) return;
  try {
    const product = await getProduct(slug);
    if (!product) { root.innerHTML = '<div class="rounded-[2rem] bg-bubblegum/30 p-16 text-center"><h1 class="font-display text-4xl font-bold">Ese dulce no existe.</h1><a class="candy-button-pink mt-6" href="/shop">Volver a la tienda</a></div>'; return; }
    const related = (await listProducts({ category: product.category })).filter((item) => item.id !== product.id).slice(0, 4);
    const gallery = product.gallery_urls?.length ? product.gallery_urls : [product.image_url];
    const unavailable = product.stock <= 0;
    root.innerHTML = `<a class="mb-8 inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-candy" href="/shop"><i class="fi fi-rr-arrow-left"></i> Volver a la tienda</a><div class="grid gap-10 lg:grid-cols-2 lg:items-start"><div class="${unavailable ? 'grayscale opacity-60' : ''}"><div class="group overflow-hidden rounded-[2rem] bg-white"><img id="main-product-image" class="aspect-square w-full cursor-zoom-in object-cover transition duration-500 group-hover:scale-105" src="${product.image_url}" alt="${product.name}"/></div><div class="mt-4 grid grid-cols-4 gap-3">${gallery.map((image) => `<button class="product-thumb overflow-hidden rounded-2xl border-2 border-transparent transition hover:border-candy" data-image="${image}" type="button"><img class="aspect-square w-full object-cover" src="${image}" alt="${product.name}"/></button>`).join('')}</div></div><div class="lg:pt-10"><span class="inline-block rounded-full bg-bubblegum px-4 py-2 text-xs font-bold uppercase tracking-[0.14em]">${unavailable ? 'Agotado' : product.category}</span><h1 class="mt-5 font-display text-5xl font-bold tracking-[-0.08em] sm:text-7xl">${product.name}</h1><p class="mt-5 font-display text-3xl font-bold">C$${product.price}</p><p class="mt-5 text-lg leading-8 text-ink/65">${product.details || product.description}</p><dl class="mt-8 grid grid-cols-2 gap-4 border-y border-ink/10 py-5 text-sm"><div><dt class="text-ink/50">SKU</dt><dd class="mt-1 font-bold">${product.sku}</dd></div><div><dt class="text-ink/50">Disponibles</dt><dd class="mt-1 font-bold">${product.stock} unidades</dd></div></dl><div class="mt-8 flex gap-3"><div class="flex items-center rounded-full border border-ink/15"><button class="detail-minus grid size-12 place-items-center" type="button" ${unavailable ? 'disabled' : ''}>−</button><span id="detail-quantity" class="w-6 text-center font-bold">1</span><button class="detail-plus grid size-12 place-items-center" type="button" ${unavailable ? 'disabled' : ''}>+</button></div><button id="detail-add" class="candy-button-pink flex-1 disabled:cursor-not-allowed disabled:bg-ink/40" type="button" data-product-id="${product.id}" ${unavailable ? 'disabled' : ''}>${unavailable ? 'Agotado' : 'Añadir al carrito'} <i class="fi fi-rr-shopping-bag"></i></button></div></div></div><section class="mt-24 border-t border-ink/10 pt-12"><p class="text-xs font-bold tracking-[0.22em] text-candy">YOU MAY ALSO LIKE</p><h2 class="mt-2 font-display text-4xl font-bold tracking-[-0.07em]">Más como esto</h2><div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">${related.map(relatedCard).join('')}</div></section>`;
    const quantity = document.querySelector('#detail-quantity');
    document.querySelector('.detail-plus')?.addEventListener('click', () => { if (quantity) quantity.textContent = String(Number(quantity.textContent) + 1); });
    document.querySelector('.detail-minus')?.addEventListener('click', () => { if (quantity) quantity.textContent = String(Math.max(1, Number(quantity.textContent) - 1)); });
    document.querySelectorAll<HTMLElement>('.product-thumb').forEach((thumb) => thumb.addEventListener('click', () => { const image = thumb.dataset.image; const main = document.querySelector<HTMLImageElement>('#main-product-image'); if (image && main) main.src = image; }));
    document.querySelector('#main-product-image')?.addEventListener('click', (event) => (event.currentTarget as HTMLElement).classList.toggle('scale-150'));
  } catch (error) {
    root.innerHTML = '<div class="rounded-[2rem] bg-bubblegum/30 p-16 text-center">No se pudo cargar el producto desde Supabase.</div>'; console.error(error);
  }
}

void render();
subscribeToProducts(() => { void render(); });