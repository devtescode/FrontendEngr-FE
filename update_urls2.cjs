const fs = require('fs');
const path = require('path');
const files = [
  'src/lib/socket.ts',
  'src/lib/ordersStore.ts',
  'src/routes/cart.tsx',
  'src/routes/orders.tsx',
  'src/routes/components.tsx',
  'src/routes/collected.tsx',
  'src/routes/dashboard.tsx',
  'src/routes/login.tsx',
  'src/routes/payment.callback.tsx',
  'src/routes/receipts.$id.tsx',
  'src/routes/register.tsx',
  'src/routes/settings.tsx',
  'src/components/ComponentCard.tsx',
  'src/routes/admin.tsx',
  'src/routes/admin.login.tsx',
  'src/routes/admin.orders.tsx',
  'src/routes/admin.pickup.tsx',
  'src/routes/admin.users.tsx',
  'src/routes/admin.collected.tsx',
];
for (const f of files) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  let d = fs.readFileSync(p, 'utf8');
  // More flexible
  d = d.replace(/import\.meta\.env\.VITE_API_URL\s*\|\|\s*"http:\/\/localhost:4500"/g,
    "getApiUrl()");
  fs.writeFileSync(p, d);
}
console.log('done');
