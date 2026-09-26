import { listProducts, subscribeToProducts, type Product } from '../lib/catalog';

function card(product: Product) {
  const unavailable = product.stock <= 0;
  const productUrl = `/product?slug=${encodeURIComponent(product.slug)}`;
  return `<article class="scroll-reveal product-card group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white/90 transition duration-300 hover:-translate-y-1 ${unavailable ? 'grayscale opacity-60' : ''}" data-category="${product.category}" data-name="${product.name.toLowerCase()}"><a href="${productUrl}" class="relative block aspect-square overflow-hidden bg-ink/10"><img class="h-full w-full object-cover transition duration-500 group-hover:scale-105" src="${product.image_url}" alt="${product.name}" loading="lazy"/><span class="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink">${unavailable ? 'Agotado' : product.category}</span></a><div class="flex flex-1 flex-col p-4"><div class="flex items-start justify-between gap-2"><h2 class="font-display text-lg font-bold leading-tight">${product.name}</h2><span class="shrink-0 font-display text-sm font-bold">C$${product.price}</span></div><p class="product-description mt-2 text-sm leading-5 text-ink/65">${product.description}</p><a class="mt-2 w-fit text-sm font-bold text-candy transition hover:text-ink" href="${productUrl}">Ver más <i class="fi fi-rr-arrow-right"></i></a><div class="mt-auto flex gap-2 pt-3"><div class="flex shrink-0 items-center rounded-full border border-ink/15"><button class="quantity-minus grid size-8 place-items-center" data-product-id="${product.id}" type="button" aria-label="Reducir cantidad" ${unavailable ? 'disabled' : ''}>−</button><span class="quantity-value w-5 text-center text-xs font-bold">1</span><button class="quantity-plus grid size-8 place-items-center" data-product-id="${product.id}" type="button" aria-label="Aumentar cantidad" ${unavailable ? 'disabled' : ''}>+</button></div><button class="add-product flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-bold text-white transition hover:bg-candy disabled:cursor-not-allowed disabled:bg-ink/40" type="button" data-product-id="${product.id}" ${unavailable ? 'disabled' : ''}>${unavailable ? 'Agotado' : 'Añadir'} <i class="fi fi-rr-shopping-bag"></i></button></div></div></article>`;
}

async function renderGrid(grid: HTMLElement) {
  try {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || grid.dataset.category || 'Shop All';
    const search = params.get('search') || grid.dataset.search || '';
    const products = await listProducts({ category, search });
    grid.innerHTML = products.length ? products.map(card).join('') : `<div class="col-span-full rounded-[2rem] border border-dashed border-ink/15 p-12 text-center text-sm text-ink/55">${grid.dataset.empty || 'Aún no hay productos publicados.'}</div>`;
    document.dispatchEvent(new CustomEvent('catalog:updated'));
  } catch (error) {
    grid.innerHTML = '<div class="col-span-full rounded-[2rem] border border-dashed border-candy/40 bg-bubblegum/20 p-12 text-center text-sm">No se pudo conectar con el catálogo de Supabase. Configura las variables públicas para cargar los productos.</div>';
    console.error(error);
  }
}

document.querySelectorAll<HTMLElement>('.product-grid').forEach((grid) => { void renderGrid(grid); subscribeToProducts(() => { void renderGrid(grid); }); });