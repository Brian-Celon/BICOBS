const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product'
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }
      }
    ],
    shippingAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: 'Marilao' },
      province: { type: String, default: 'Bulacan' },
      phone: { type: String, required: true }
    },
    fulfillmentType: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'gcash', 'online'],
      default: 'cash'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid'
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready_for_pickup', 'completed', 'cancelled'],
      default: 'pending'
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0.0
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Order', orderSchema);
