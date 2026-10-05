const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function updateAll() {
  const updates = [
    {
      id: 95,
      sku: 'TBS-SPA-SPEEDONE-095',
      name: 'Speedone Pilot',
      category: 'pedals',
      imageUrl: 'https://res.cloudinary.com/q3ywfemm/image/upload/v1790584473/Speedone_Pilot_Pedal.jpg',
      description: 'Speedone Pilot (Pedals) available at Taurus Bike Shop.'
    },
    {
      id: 96,
      sku: 'TBS-SPA-SPEEDONE-096',
      name: 'Speedone Pilot',
      category: 'pedals',
      imageUrl: 'https://res.cloudinary.com/q3ywfemm/image/upload/v1790584473/Speedone_Pilot_Pedal.jpg',
      description: 'Speedone Pilot (Pedals) available at Taurus Bike Shop.'
    },
    {
      id: 28,
      sku: 'TBS-SPA-SPEEDONE-028',
      name: 'Speedone Soldier BOOST',
      category: 'fork',
      imageUrl: 'https://res.cloudinary.com/q3ywfemm/image/upload/v1790584507/Speedone_Soldier.jpg',
      description: 'Speedone Soldier BOOST (Fork) available at Taurus Bike Shop.'
    },
    {
      id: 41,
      sku: 'TBS-SPA-SPEEDONE-041',
      name: 'SpeedOne Soldier',
      category: 'hubs',
      imageUrl: 'https://res.cloudinary.com/q3ywfemm/image/upload/Speedone_Soldier_Hub.jpg',
      description: 'SpeedOne Soldier (Hubs) available at Taurus Bike Shop.'
    },
    {
      id: 35,
      sku: 'TBS-SPA-FORKWEAP-035',
      name: 'LDCNC 3.0 Hub',
      category: 'hubs',
      imageUrl: 'https://res.cloudinary.com/q3ywfemm/image/upload/Hub_LDNC_3.0.jpg',
      description: 'LDCNC 3.0 Hub (Hubs) available at Taurus Bike Shop.'
    },
    {
      id: 94,
      sku: 'TBS-ACC-RAGUSAR1-094',
      name: 'Weapon Wave',
      category: 'handle_grip',
      imageUrl: 'https://res.cloudinary.com/q3ywfemm/image/upload/v1790584477/Weapon_Wave.jpg',
      description: 'Weapon Wave (Handle Grip) available at Taurus Bike Shop.'
    },
    {
      id: 115,
      sku: 'TBS-SPA-RAGUSAR1-115',
      name: 'Jalco Wellington Red',
      category: 'rims',
      imageUrl: 'https://res.cloudinary.com/q3ywfemm/image/upload/Jalco_Wellington_Red.jpg',
      description: 'Jalco Wellington Red (Rims) available at Taurus Bike Shop.'
    }
  ];

  console.log('1. Updating PostgreSQL database...');
  for (const u of updates) {
    const res = await db.query(
      `UPDATE products 
       SET name = $1, image_url = $2, description = $3 
       WHERE id = $4 
       RETURNING id, name, category, image_url`,
      [u.name, u.imageUrl, u.description, u.id]
    );
    console.log('Updated DB row:', res.rows[0]);
  }

  console.log('\n2. Updating back-end/data/products.json...');
  const jsonPath = path.join(__dirname, '..', 'data', 'products.json');
  const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  for (const u of updates) {
    const item = products.find(p => p.sku === u.sku);
    if (item) {
      item.name = u.name;
      item.imageUrl = u.imageUrl;
      item.description = u.description;
      console.log('Updated JSON item:', item.sku, '->', item.name, item.category, item.imageUrl);
    } else {
      console.warn('Could not find item with SKU:', u.sku);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf8');
  console.log('Successfully saved back-end/data/products.json');

  process.exit(0);
}

updateAll().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
