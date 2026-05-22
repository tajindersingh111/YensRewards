async function test() {
  try {
    console.log('Testing /api/sites...');
    const sitesRes = await fetch('http://127.0.0.1:5000/api/sites');
    if (!sitesRes.ok) {
      throw new Error(`Failed to fetch sites: ${sitesRes.status} ${sitesRes.statusText}`);
    }
    const sites = await sitesRes.json();
    console.log(`✅ /api/sites works! Returned ${sites.length} sites.`);
    console.log('Sample site:', sites[0]);

    console.log('\nTesting /api/products...');
    const productsRes = await fetch('http://127.0.0.1:5000/api/products');
    if (!productsRes.ok) {
      throw new Error(`Failed to fetch products: ${productsRes.status} ${productsRes.statusText}`);
    }
    const products = await productsRes.json();
    console.log(`✅ /api/products works! Returned ${products.length} products.`);
    console.log('Sample product:', products[0]);
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

test();
