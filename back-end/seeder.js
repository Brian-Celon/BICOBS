const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

// Use Google/Cloudflare DNS for Windows SRV lookup fix
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Load environment variables
dotenv.config();

// Load models
const Product = require('./models/Product');

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// Read JSON files
const products = JSON.parse(
  fs.readFileSync(`${__dirname}/data/products.json`, 'utf-8')
);

// Import into DB
const importData = async () => {
  try {
    await Product.deleteMany();
    await Product.create(products);
    console.log('[Seeder] 150 Products Imported Successfully to MongoDB Atlas!');
    process.exit();
  } catch (err) {
    console.error(`[Seeder Error] ${err.message}`);
    process.exit(1);
  }
};

// Delete data from DB
const destroyData = async () => {
  try {
    await Product.deleteMany();
    console.log('[Seeder] Product Data Destroyed!');
    process.exit();
  } catch (err) {
    console.error(`[Seeder Error] ${err.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  destroyData();
} else {
  console.log('Usage: node seeder.js -i (import) or node seeder.js -d (destroy)');
  process.exit();
}
