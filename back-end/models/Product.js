const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      enum: ['bicycles', 'spare_parts', 'accessories', 'services'],
      lowercase: true,
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true,
      default: 'https://via.placeholder.com/300?text=Taurus+Bike+Shop'
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Auto update availability status based on stock count
productSchema.pre('save', function (next) {
  if (this.stockQuantity <= 0) {
    this.isAvailable = false;
  } else {
    this.isAvailable = true;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
