const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testBulkUpload() {
  try {
    // Step 1: Login to get token (using manager credentials)
    console.log('🔐 Logging in...');
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'manager@example.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Get plants
    console.log('\n📍 Fetching plants...');
    const plantsRes = await axios.get('http://localhost:3001/api/plants', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Plants:', plantsRes.data.plants?.map(p => ({ id: p.id, name: p.plant_name })));
    
    // Step 3: Get categories
    console.log('\n📦 Fetching categories...');
    const categoriesRes = await axios.get('http://localhost:3001/api/categories', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Categories:', categoriesRes.data.categories?.slice(0, 3).map(c => ({ id: c.id, name: c.category_name })));
    
    // Step 4: Get products
    console.log('\n🔧 Fetching products...');
    const productsRes = await axios.get('http://localhost:3001/api/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Products:', productsRes.data.products?.slice(0, 3).map(p => ({ id: p.id, name: p.product_name, category_id: p.category_id })));
    
    // Generate CSV with real data
    const plant = plantsRes.data.plants?.[0];
    const category = categoriesRes.data.categories?.[0];
    const products = productsRes.data.products?.filter(p => p.category_id === category.id) || [];
    
    if (!plant || !category || products.length === 0) {
      console.error('❌ Missing required data. Please create plants, categories, and products first.');
      return;
    }
    
    const csvContent = `Plant,Category,Product,Type,Sub Type,Manufacturing Date,Quantity,Serial Number,Model,Manufacturer,Unit Price,Asset Code,Warranty Start,Warranty End
${plant.plant_name},${category.category_name},${products[0]?.product_name || 'Product 1'},Type A,SubType 1,2024-01-15,2,SN-TEST-001,Model-X,Test Manufacturer,25000,AUTO,2024-01-15,2027-01-15
${plant.plant_name},${category.category_name},${products[0]?.product_name || 'Product 1'},Type B,SubType 2,2024-02-20,1,SN-TEST-002,Model-Y,Test Manufacturer,35000,AUTO,2024-02-20,2027-02-20`;
    
    fs.writeFileSync('/tmp/inventory_test.csv', csvContent);
    console.log('\n📄 CSV file created with real data');
    
    // Step 5: Upload CSV
    console.log('\n📤 Uploading CSV...');
    const form = new FormData();
    form.append('file', fs.createReadStream('/tmp/inventory_test.csv'));
    
    const uploadRes = await axios.post('http://localhost:3001/api/inventory/bulk-upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('\n✅ Upload successful!');
    console.log('Results:', JSON.stringify(uploadRes.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testBulkUpload();
