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
const Order = require('./models/Order');
const Billing = require('./models/Billing');
const User = require('./models/User');

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
    await Order.deleteMany();
    await Billing.deleteMany();
    await User.deleteMany();

    await Product.create(products);
    console.log('[Seeder] Cleaned Orders, Billing, and Users.');
    console.log('[Seeder] 150 Fresh Products Imported Successfully to MongoDB Atlas!');
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
    await Order.deleteMany();
    await Billing.deleteMany();
    await User.deleteMany();
    console.log('[Seeder] All Collections Cleared from Database!');
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
