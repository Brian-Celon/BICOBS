const { pool } = require('../config/db');

// Helper to format an order row and its items
const formatOrder = (orderRow, items = []) => ({
  _id: orderRow.id.toString(),
  id: orderRow.id,
  orderNumber: orderRow.order_number,
  order_number: orderRow.order_number,
  invoiceNumber: orderRow.invoice_number || null,
  invoice_number: orderRow.invoice_number || null,
  user: orderRow.user_id,
  customerName: orderRow.customer_name,
  customerEmail: orderRow.customer_email,
  customerPhone: orderRow.customer_phone,
  deliveryType: orderRow.delivery_type,
  deliveryAddress: orderRow.delivery_address,
  notes: orderRow.notes,
  paymentMethod: orderRow.payment_method,
  subtotal: parseFloat(orderRow.subtotal || 0),
  shippingFee: parseFloat(orderRow.shipping_fee || 0),
  totalPrice: parseFloat(orderRow.total_amount),
  total_amount: parseFloat(orderRow.total_amount),
  orderStatus: orderRow.order_status,
  order_status: orderRow.order_status,
  paymentStatus: orderRow.payment_status,
  payment_status: orderRow.payment_status,
  orderItems: items.map(i => ({
    id: i.id,
    product: i.product_id,
    name: i.product_name,
    quantity: i.quantity,
    price: parseFloat(i.unit_price),
    subtotal: parseFloat(i.subtotal)
  })),
  items: items.map(i => ({
    id: i.id,
    product: i.product_id,
    name: i.product_name,
    quantity: i.quantity,
    price: parseFloat(i.unit_price),
    subtotal: parseFloat(i.subtotal)
  })),
  createdAt: orderRow.created_at,
  updatedAt: orderRow.updated_at
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Authenticated Customers)
const createOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      orderItems,
      shippingAddress,
      fulfillmentType,
      paymentMethod,
      deliveryFee,
      notes
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No order items provided'
      });
    }

    const customerPhone = shippingAddress && shippingAddress.phone ? shippingAddress.phone : (req.user.phone || '');
    const customerAddress = shippingAddress && shippingAddress.street ? 
      `${shippingAddress.street}, ${shippingAddress.barangay || ''}, ${shippingAddress.city || ''}` : 
      (req.user.address || '');

    if (!customerPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a contact phone number'
      });
    }

    await client.query('BEGIN');

    // 1. Validate items & check stock
    let itemsPrice = 0;
    const processedItems = [];

    for (const item of orderItems) {
      const prodId = item.product || item.productId || item._id || item.id;
      const prodRes = await client.query(
        'SELECT id, name, price, stock_quantity FROM products WHERE id = $1 FOR UPDATE',
        [prodId]
      );

      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          status: 'error',
          message: `Product not found: ID ${prodId}`
        });
      }

      const product = prodRes.rows[0];
      const reqQty = parseInt(item.quantity, 10);

      if (product.stock_quantity < reqQty) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock for product '${product.name}'. Available: ${product.stock_quantity}, Requested: ${reqQty}`
        });
      }

      const unitPrice = parseFloat(product.price);
      const subtotal = unitPrice * reqQty;
      itemsPrice += subtotal;

      processedItems.push({
        productId: product.id,
        name: product.name,
        quantity: reqQty,
        price: unitPrice,
        subtotal
      });

      // 2. Deduct product stock in PostgreSQL
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [reqQty, product.id]
      );
    }

    const deliveryType = fulfillmentType === 'delivery' ? 'delivery' : 'pickup';
    const normalizedMethod = (paymentMethod || (deliveryType === 'delivery' ? '' : 'cash')).toLowerCase().trim();

    // When checking out, payment MUST be handled first when mode is delivery.
    // Available payment methods for delivery: BPI, Maya, and GCash.
    if (deliveryType === 'delivery') {
      const allowedDeliveryPayments = ['bpi', 'maya', 'paymaya', 'gcash', 'card', 'credit_card', 'debit_card'];
      if (!allowedDeliveryPayments.includes(normalizedMethod)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          status: 'error',
          message: 'Payment must be handled first for delivery orders. Available payment methods: Card, GCash, Maya, and BPI.'
        });
      }
    }

    const calculatedDeliveryFee = deliveryType === 'delivery' ? parseFloat(deliveryFee !== undefined ? deliveryFee : 150) : 0;
    const discountAmount = Math.max(0, parseFloat(req.body.discount || 0));
    const totalPrice = Math.max(0, itemsPrice - discountAmount + calculatedDeliveryFee);

    // Determine payment and order status
    const isPrepaid = ['bpi', 'maya', 'paymaya', 'gcash', 'card', 'credit_card', 'debit_card'].includes(normalizedMethod);
    const orderPaymentStatus = (deliveryType === 'delivery' || isPrepaid) ? 'paid' : 'pending';
    const orderStatus = (deliveryType === 'delivery' || isPrepaid) ? 'confirmed' : 'pending';

    // Generate unique order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

    // 3. Insert Order
    const insertOrderSql = `
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        delivery_type, delivery_address, notes, payment_method,
        subtotal, shipping_fee, total_amount, order_status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const orderRes = await client.query(insertOrderSql, [
      orderNumber,
      req.user.id,
      req.user.name,
      req.user.email,
      customerPhone,
      deliveryType,
      customerAddress,
      notes || '',
      normalizedMethod || 'cash',
      itemsPrice,
      calculatedDeliveryFee,
      totalPrice,
      orderStatus,
      orderPaymentStatus
    ]);

    const createdOrder = orderRes.rows[0];

    // 4. Insert Order Items
    for (const p of processedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [createdOrder.id, p.productId, p.name, p.quantity, p.price, p.subtotal]
      );
    }

    // 5. Generate Billing Record
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;
    const paymentDate = orderPaymentStatus === 'paid' ? new Date() : null;
    await client.query(
      `INSERT INTO billings (
        order_id, invoice_number, customer_name, customer_email, customer_phone,
        subtotal, shipping_fee, total_amount, payment_method, payment_status, payment_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
      [
        createdOrder.id,
        invoiceNumber,
        req.user.name,
        req.user.email,
        customerPhone,
        itemsPrice,
        calculatedDeliveryFee,
        totalPrice,
        normalizedMethod || 'cash',
        orderPaymentStatus,
        paymentDate
      ]
    );

    await client.query('COMMIT');

    createdOrder.invoice_number = invoiceNumber;

    res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      data: formatOrder(createdOrder, processedItems.map(p => ({
        id: p.productId,
        product_id: p.productId,
        product_name: p.name,
        quantity: p.quantity,
        unit_price: p.price,
        subtotal: p.subtotal
      })))
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Get order details by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderRes = await pool.query(
      `SELECT o.*, b.invoice_number 
       FROM orders o 
       LEFT JOIN billings b ON b.order_id = o.id 
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // Authorization check
    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to view this order' });
    }

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);

    res.status(200).json({
      status: 'success',
      data: formatOrder(order, itemsRes.rows)
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
    const ordersRes = await pool.query(
      `SELECT o.*, b.invoice_number 
       FROM orders o 
       LEFT JOIN billings b ON b.order_id = o.id 
       WHERE o.user_id = $1 
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    const orders = [];
    for (const ord of ordersRes.rows) {
      const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [ord.id]);
      orders.push(formatOrder(ord, itemsRes.rows));
    }

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
    let sql = `
      SELECT o.*, b.invoice_number, u.full_name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN billings b ON b.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status.toLowerCase());
      sql += ` AND LOWER(o.order_status) = $${params.length}`;
    }

    if (paymentStatus) {
      params.push(paymentStatus.toLowerCase());
      sql += ` AND LOWER(o.payment_status) = $${params.length}`;
    }

    sql += ' ORDER BY o.created_at DESC';

    const ordersRes = await pool.query(sql, params);
    const orders = [];

    for (const ord of ordersRes.rows) {
      const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [ord.id]);
      orders.push(formatOrder(ord, itemsRes.rows));
    }

    res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status & payment status with validation and automatic stock rollback
// @route   PUT /api/orders/:id/status
// @access  Private (Admin / Staff)
const updateOrderStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const rawOrderStatus = req.body.orderStatus || req.body.status || req.body.order_status;
    const rawPaymentStatus = req.body.paymentStatus || req.body.payment_status;

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const current = existing.rows[0];
    const currentStatus = (current.order_status || 'pending').toLowerCase();
    const targetStatus = rawOrderStatus ? rawOrderStatus.toLowerCase() : currentStatus;
    const newPaymentStatus = rawPaymentStatus ? rawPaymentStatus.toLowerCase() : current.payment_status;

    // Transition Validation
    if (currentStatus === 'completed' && targetStatus === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Cannot cancel an order that has already been completed'
      });
    }

    if (currentStatus === 'cancelled' && targetStatus !== 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Cannot change status of an already cancelled order'
      });
    }

    // Automatic Stock Rollback if cancelling
    if (targetStatus === 'cancelled' && currentStatus !== 'cancelled') {
      const itemsRes = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
      for (const item of itemsRes.rows) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    const updateSql = `
      UPDATE orders
      SET order_status = $1, payment_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const updatedRes = await client.query(updateSql, [targetStatus, newPaymentStatus, id]);

    // Sync billing record if payment status was updated
    if (rawPaymentStatus) {
      await client.query(
        `UPDATE billings
         SET payment_status = $1, payment_date = (CASE WHEN $1 = 'paid' THEN CURRENT_TIMESTAMP ELSE payment_date END)
         WHERE order_id = $2;`,
        [newPaymentStatus, id]
      );
    }

    await client.query('COMMIT');

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const billingRes = await pool.query('SELECT invoice_number FROM billings WHERE order_id = $1', [id]);
    const orderData = updatedRes.rows[0];
    if (billingRes.rows.length > 0) {
      orderData.invoice_number = billingRes.rows[0].invoice_number;
    }

    res.status(200).json({
      status: 'success',
      message: `Order status updated to ${targetStatus}`,
      data: formatOrder(orderData, itemsRes.rows)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};
