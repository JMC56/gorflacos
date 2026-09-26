// @ts-nocheck
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const envText = await readFile('.env', 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.trim().startsWith('#')).map((line) => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1)];
}));
const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const anonKey = env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en .env.');

const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
const productsResponse = await fetch(`${supabaseUrl}/rest/v1/products?select=id,name,image_url,gallery_urls&order=created_at.asc`, { headers });
if (!productsResponse.ok) throw new Error(`No se pudieron leer los productos: ${await productsResponse.text()}`);
const products = await productsResponse.json();
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'gorflacos-square-images-'));

function getDimensions(path) {
  const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], { encoding: 'utf8' });
  const width = Number(output.match(/pixelWidth: (\d+)/)?.[1]);
  const height = Number(output.match(/pixelHeight: (\d+)/)?.[1]);
  if (!width || !height) throw new Error(`No se pudieron leer las dimensiones de ${path}.`);
  return { width, height };
}

async function uploadSquareImage(url, productId, imageIndex) {
  const imageResponse = await fetch(url);
  if (!imageResponse.ok) throw new Error(`No se pudo descargar una imagen del producto ${productId}: HTTP ${imageResponse.status}`);

  const sourcePath = join(temporaryDirectory, `${productId}-${imageIndex}-source`);
  const outputPath = join(temporaryDirectory, `${productId}-${imageIndex}-square.png`);
  await writeFile(sourcePath, Buffer.from(await imageResponse.arrayBuffer()));
  const { width, height } = getDimensions(sourcePath);
  const size = Math.min(width, height, 1200);
  const cropX = Math.floor((width - size) / 2);
  const cropY = Math.floor((height - size) / 2);

  execFileSync('sips', [
    '--cropToHeightWidth', String(size), String(size),
    '--cropOffset', String(cropY), String(cropX),
    sourcePath, '--setProperty', 'format', 'png', '--out', outputPath
  ], { stdio: 'pipe' });

  const path = `migrated/${productId}/${randomUUID()}.png`;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${encodedPath}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/png', 'x-upsert': 'false' },
    body: await readFile(outputPath)
  });
  if (!uploadResponse.ok) throw new Error(`No se pudo guardar el recorte del producto ${productId}: ${await uploadResponse.text()}`);

  return `${supabaseUrl}/storage/v1/object/public/product-images/${encodedPath}`;
}

try {
  let imageIndex = 0;
  for (const product of products) {
    const oldUrls = [product.image_url, ...(product.gallery_urls || [])];
    const newUrls = [];
    for (const url of oldUrls) {
      imageIndex += 1;
      newUrls.push(await uploadSquareImage(url, product.id, imageIndex));
    }

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ image_url: newUrls[0], gallery_urls: newUrls.slice(1), updated_at: new Date().toISOString() })
    });
    if (!updateResponse.ok) throw new Error(`No se pudieron actualizar las imágenes de ${product.name}: ${await updateResponse.text()}`);
    console.log(`Imágenes cuadradas: ${product.name} (${newUrls.length})`);
  }
  console.log(`Migración completada: ${products.length} productos.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}