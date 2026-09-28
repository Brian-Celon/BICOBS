const Order = require('../models/Order');
const Product = require('../models/Product');
const Billing = require('../models/Billing');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Authenticated Customers)
const createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      fulfillmentType,
      paymentMethod,
      deliveryFee
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No order items provided'
      });
    }

    if (!shippingAddress || !shippingAddress.phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide contact phone number in shipping address'
      });
    }

    // 1. Validate items & check stock
    let itemsPrice = 0;
    const processedItems = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          status: 'error',
          message: `Product not found: ID ${item.product}`
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock for product '${product.name}'. Available: ${product.stockQuantity}, Requested: ${item.quantity}`
        });
      }

      // Calculate price and add to processed items
      const itemTotalPrice = product.price * item.quantity;
      itemsPrice += itemTotalPrice;

      processedItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price
      });

      // 2. Deduct product stock
      product.stockQuantity -= item.quantity;
      await product.save();
    }

    const calculatedDeliveryFee = fulfillmentType === 'delivery' ? (deliveryFee || 100) : 0;
    const totalPrice = itemsPrice + calculatedDeliveryFee;

    // 3. Create Order
    const order = await Order.create({
      user: req.user._id,
      orderItems: processedItems,
      shippingAddress,
      fulfillmentType: fulfillmentType || 'pickup',
      paymentMethod: paymentMethod || 'cash',
      itemsPrice,
      deliveryFee: calculatedDeliveryFee,
      totalPrice
    });

    // 4. Auto-generate billing invoice for the order
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomNum}`;

    await Billing.create({
      order: order._id,
      invoiceNumber,
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerPhone: shippingAddress.phone,
      items: processedItems.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        total: i.price * i.quantity
      })),
      subtotal: itemsPrice,
      deliveryFee: calculatedDeliveryFee,
      totalAmount: totalPrice,
      paymentMethod: order.paymentMethod,
      paymentStatus: 'unpaid',
      issuedBy: req.user._id
    });

    res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('orderItems.product', 'name category imageUrl');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Ensure customer can only view their own order (unless admin/staff)
    if (
      req.user.role === 'customer' &&
      order.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      status: 'success',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private (Customer)
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Shop Owner / Staff dashboard)
// @route   GET /api/orders
// @access  Private (Admin / Staff)
const getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.query;
    let query = {};

    if (status) {
      query.orderStatus = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status & payment status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin / Staff)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
      if (orderStatus === 'completed') {
        order.isCompleted = true;
        order.completedAt = Date.now();
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') {
        order.isPaid = true;
        order.paidAt = Date.now();

        // Also update associated billing invoice
        await Billing.findOneAndUpdate(
          { order: order._id },
          { paymentStatus: 'paid' }
        );
      }
    }

    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};
