async function testCreation() {
  try {
    console.log('1. Logging in as admin...');
    const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@yensrewards.com',
        password: '123456'
      })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
    }

    const loginData = await loginRes.json();
    console.log('✅ Login successful! User role:', loginData.user?.role);
    const token = loginData.accessToken;

    if (!token) {
      throw new Error('No access token returned in login response.');
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Create Site
    console.log('\n2. Creating new physical site...');
    const siteData = {
      name: 'Test Auto Stall',
      channelName: 'TESTSTALL',
      type: 'stall',
      location: 'Test Automated Location',
      operatingDays: ['monday', 'wednesday', 'friday'],
      openTime: '09:00',
      closeTime: '18:00',
      isActive: true
    };

    const siteRes = await fetch('http://127.0.0.1:5000/api/admin/sites', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(siteData)
    });

    if (!siteRes.ok) {
      const errText = await siteRes.text();
      throw new Error(`Failed to create site: ${siteRes.status} - ${errText}`);
    }

    const createdSite = await siteRes.json();
    console.log('✅ Site created successfully:', createdSite);

    // 3. Create Product
    console.log('\n3. Creating new product...');
    const productData = {
      name: 'Test Choco Shake',
      category: 'shakes',
      price: '59.50',
      cost: '20.00',
      available: true
    };

    const productRes = await fetch('http://127.0.0.1:5000/api/admin/products', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(productData)
    });

    if (!productRes.ok) {
      const errText = await productRes.text();
      throw new Error(`Failed to create product: ${productRes.status} - ${errText}`);
    }

    const createdProduct = await productRes.json();
    console.log('✅ Product created successfully:', createdProduct);

    // 4. Create Daily Sale Record
    console.log('\n4. Creating daily sales record...');
    const saleData = {
      date: '2026-05-20',
      orderChannel: 'TESTSTALL',
      netSales: '2500.00',
      otherSales: '150.00',
      grabFee: '0.00',
      totalSales: '2650.00'
    };

    const saleRes = await fetch('http://127.0.0.1:5000/api/admin/sales', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(saleData)
    });

    if (!saleRes.ok) {
      const errText = await saleRes.text();
      throw new Error(`Failed to create sale: ${saleRes.status} - ${errText}`);
    }

    const createdSale = await saleRes.json();
    console.log('✅ Daily sale record created successfully:', createdSale);

    console.log('\n🎉 ALL CREATION ENDPOINTS ARE WORKING PERFECTLY!');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  }
}

testCreation();
