import { listProducts, subscribeToProducts, type Product } from '../lib/catalog';

function card(product: Product) {
  const unavailable = product.stock <= 0;
  return `<article class="scroll-reveal product-card group flex h-full flex-col overflow-hidden rounded-[2rem] border border-ink/10 bg-white/90 shadow-candy transition duration-300 hover:-translate-y-1 ${unavailable ? 'grayscale opacity-60' : ''}" data-category="${product.category}" data-name="${product.name.toLowerCase()}"><a href="/product?slug=${encodeURIComponent(product.slug)}" class="relative block aspect-[4/3] overflow-hidden bg-ink/10"><img class="h-full w-full object-cover transition duration-500 group-hover:scale-105" src="${product.image_url}" alt="${product.name}" loading="lazy"/><span class="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-ink">${unavailable ? 'Agotado' : product.category}</span></a><div class="flex flex-1 flex-col p-6"><div class="flex items-start justify-between gap-4"><h2 class="font-display text-2xl font-bold tracking-[-0.04em]">${product.name}</h2><span class="shrink-0 font-display text-lg font-bold">C$${product.price}</span></div><p class="mt-3 flex-1 text-sm leading-6 text-ink/65">${product.description}</p><div class="mt-6 flex gap-2"><div class="flex items-center rounded-full border border-ink/15"><button class="quantity-minus grid size-10 place-items-center" data-product-id="${product.id}" type="button" ${unavailable ? 'disabled' : ''}>−</button><span class="quantity-value w-5 text-center text-sm font-bold">1</span><button class="quantity-plus grid size-10 place-items-center" data-product-id="${product.id}" type="button" ${unavailable ? 'disabled' : ''}>+</button></div><button class="add-product flex flex-1 items-center justify-between rounded-full bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-candy disabled:cursor-not-allowed disabled:bg-ink/40" type="button" data-product-id="${product.id}" ${unavailable ? 'disabled' : ''}>${unavailable ? 'Agotado' : 'Añadir'} <i class="fi fi-rr-shopping-bag"></i></button></div></div></article>`;
}

async function renderGrid(grid: HTMLElement) {
  try {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || grid.dataset.category || 'Shop All';
    const search = params.get('search') || grid.dataset.search || '';
    const products = await listProducts({ category, featured: grid.dataset.featured === 'true', search });
    grid.innerHTML = products.length ? products.map(card).join('') : `<div class="col-span-full rounded-[2rem] border border-dashed border-ink/15 p-12 text-center text-sm text-ink/55">${grid.dataset.empty || 'Aún no hay productos publicados.'}</div>`;
    document.dispatchEvent(new CustomEvent('catalog:updated'));
  } catch (error) {
    grid.innerHTML = '<div class="col-span-full rounded-[2rem] border border-dashed border-candy/40 bg-bubblegum/20 p-12 text-center text-sm">No se pudo conectar con el catálogo de Supabase. Configura las variables públicas para cargar los productos.</div>';
    console.error(error);
  }
}

document.querySelectorAll<HTMLElement>('.product-grid').forEach((grid) => { void renderGrid(grid); subscribeToProducts(() => { void renderGrid(grid); }); });