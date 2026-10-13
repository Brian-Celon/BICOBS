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
  paymentReference: orderRow.payment_reference || '',
  payment_reference: orderRow.payment_reference || '',
  paymentProof: orderRow.payment_proof || '',
  payment_proof: orderRow.payment_proof || '',
  subtotal: parseFloat(orderRow.subtotal || 0),
  shippingFee: parseFloat(orderRow.shipping_fee || 0),
  totalPrice: parseFloat(orderRow.total_amount),
  total_amount: parseFloat(orderRow.total_amount),
  orderStatus: orderRow.order_status,
  order_status: orderRow.order_status,
  paymentStatus: orderRow.payment_status,
  payment_status: orderRow.payment_status,
  declineReason: orderRow.decline_reason || '',
  decline_reason: orderRow.decline_reason || '',
  customerConfirmed: !!orderRow.customer_confirmed,
  customer_confirmed: !!orderRow.customer_confirmed,
  customerConfirmedAt: orderRow.customer_confirmed_at || null,
  customer_confirmed_at: orderRow.customer_confirmed_at || null,
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
      notes,
      paymentReference,
      payment_reference,
      referenceNumber,
      paymentProof,
      payment_proof
    } = req.body;

    const finalPaymentRef = (paymentReference || payment_reference || referenceNumber || '').trim();
    const finalPaymentProof = (paymentProof || payment_proof || '').trim();

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
        'UPDATE products SET stock_quantity = stock_quantity - $1, is_available = CASE WHEN stock_quantity - $1 <= 0 THEN false ELSE is_available END WHERE id = $2',
        [reqQty, product.id]
      );
    }

    const deliveryType = fulfillmentType === 'delivery' ? 'delivery' : 'pickup';
    const calculatedDeliveryFee = deliveryType === 'delivery' ? parseFloat(deliveryFee || 100) : 0;
    const totalPrice = itemsPrice + calculatedDeliveryFee;

    // Generate unique order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

    // 3. Insert Order
    const insertOrderSql = `
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        delivery_type, delivery_address, notes, payment_method,
        subtotal, shipping_fee, total_amount, order_status, payment_status,
        payment_reference, payment_proof
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'payment_confirmation', 'pending', $13, $14)
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
      paymentMethod || 'cash',
      itemsPrice,
      calculatedDeliveryFee,
      totalPrice,
      finalPaymentRef,
      finalPaymentProof
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
    await client.query(
      `INSERT INTO billings (
        order_id, invoice_number, customer_name, customer_email, customer_phone,
        subtotal, shipping_fee, total_amount, payment_method, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending');`,
      [
        createdOrder.id,
        invoiceNumber,
        req.user.name,
        req.user.email,
        customerPhone,
        itemsPrice,
        calculatedDeliveryFee,
        totalPrice,
        paymentMethod || 'cash'
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
    const customerConfirmed = req.body.customerConfirmed !== undefined ? !!req.body.customerConfirmed : undefined;

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const current = existing.rows[0];
    const currentStatus = (current.order_status || 'pending').toLowerCase();
    let targetStatus = rawOrderStatus ? rawOrderStatus.toLowerCase().replace(/\s+/g, '_') : currentStatus;

    // Normalize status names to lifecycle standards
    if (targetStatus === 'ready_for_deliver') targetStatus = 'ready_for_delivery';
    if (targetStatus === 'shipped') targetStatus = 'out_for_delivery';
    if (targetStatus === 'confirmed') targetStatus = 'payment_confirmed';

    let newPaymentStatus = rawPaymentStatus ? rawPaymentStatus.toLowerCase() : current.payment_status;
    if (targetStatus === 'payment_confirmed' && !rawPaymentStatus) {
      newPaymentStatus = 'paid';
    } else if ((targetStatus === 'declined' || targetStatus === 'rejected') && !rawPaymentStatus) {
      newPaymentStatus = 'declined';
    }

    // Delivery vs Pickup validation
    const deliveryType = (current.delivery_type || 'delivery').toLowerCase();
    if (deliveryType === 'delivery' && targetStatus === 'ready_for_pickup') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Cannot set status to Ready for Pickup for a delivery order. Please select Ready for Delivery or Out for Delivery.'
      });
    }

    if (deliveryType === 'pickup' && (targetStatus === 'ready_for_delivery' || targetStatus === 'out_for_delivery')) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Cannot set delivery status for an in-store pickup order. Please select Ready for Pickup.'
      });
    }

    // Transition Validation
    if (currentStatus === 'completed' && (targetStatus === 'cancelled' || targetStatus === 'declined' || targetStatus === 'rejected')) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Cannot cancel or reject an order that has already been completed'
      });
    }

    const wasCancelledOrRejected = ['cancelled', 'declined', 'rejected'].includes(currentStatus);
    const isNowCancelledOrRejected = ['cancelled', 'declined', 'rejected'].includes(targetStatus);

    if (wasCancelledOrRejected && !isNowCancelledOrRejected) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Cannot reactivate an order that was cancelled or rejected'
      });
    }

    // Automatic Stock Rollback when order is cancelled, declined, or rejected
    if (isNowCancelledOrRejected && !wasCancelledOrRejected) {
      const itemsRes = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
      for (const item of itemsRes.rows) {
        if (item.product_id) {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity + $1, is_available = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    // Handle customer confirmation flag update
    const updateParams = [targetStatus, newPaymentStatus];
    let customerConfirmSql = '';
    if (customerConfirmed !== undefined) {
      updateParams.push(customerConfirmed);
      customerConfirmSql = `, customer_confirmed = $${updateParams.length}, customer_confirmed_at = ${customerConfirmed ? 'CURRENT_TIMESTAMP' : 'NULL'}`;
    }
    updateParams.push(id);
    const whereIdParamIndex = updateParams.length;

    const updateSql = `
      UPDATE orders
      SET order_status = $1, payment_status = $2${customerConfirmSql}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${whereIdParamIndex}
      RETURNING *;
    `;
    const updatedRes = await client.query(updateSql, updateParams);

    // Sync billing record if payment status was updated
    if (newPaymentStatus) {
      const allowedBillingStatuses = ['pending', 'paid', 'failed', 'refunded', 'declined'];
      const billingStatus = allowedBillingStatuses.includes(newPaymentStatus) ? newPaymentStatus : 'pending';
      if (billingStatus === 'paid') {
        await client.query(
          `UPDATE billings
           SET payment_status = 'paid', payment_date = CURRENT_TIMESTAMP
           WHERE order_id = $1;`,
          [id]
        );
      } else {
        await client.query(
          `UPDATE billings
           SET payment_status = $1
           WHERE order_id = $2;`,
          [billingStatus, id]
        );
      }
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

// @desc    Confirm customer payment for an order and change status to payment_confirmed / processing
// @route   PUT /api/orders/:id/verify-payment
// @access  Private (Admin / Staff)
const verifyOrderPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const updateSql = `
      UPDATE orders
      SET payment_status = 'paid', order_status = 'payment_confirmed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const updatedRes = await client.query(updateSql, [id]);

    // Sync billing record as paid
    await client.query(
      `UPDATE billings
       SET payment_status = 'paid', payment_date = CURRENT_TIMESTAMP
       WHERE order_id = $1;`,
      [id]
    );

    await client.query('COMMIT');

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const billingRes = await pool.query('SELECT invoice_number FROM billings WHERE order_id = $1', [id]);
    const orderData = updatedRes.rows[0];
    if (billingRes.rows.length > 0) {
      orderData.invoice_number = billingRes.rows[0].invoice_number;
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment confirmed! Order status moved to Payment Confirmed.',
      data: formatOrder(orderData, itemsRes.rows)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Decline/reject customer payment and return stock quantity to inventory
// @route   PUT /api/orders/:id/decline-payment
// @access  Private (Admin / Staff)
const declineOrderPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const reason = (req.body && req.body.reason) ? req.body.reason.trim() : 'Payment was not verified or rejected';

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const current = existing.rows[0];

    // If order was not already cancelled or declined, restore product stock quantity to inventory
    if (current.order_status !== 'cancelled' && current.order_status !== 'declined' && current.order_status !== 'rejected') {
      const items = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
      for (const item of items.rows) {
        if (item.product_id) {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity + $1, is_available = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    const updateSql = `
      UPDATE orders
      SET payment_status = 'declined', order_status = 'declined', decline_reason = $2, notes = CASE WHEN notes IS NULL OR notes = '' THEN $2 ELSE notes || ' | ' || $2 END, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const updatedRes = await client.query(updateSql, [id, reason]);

    // Sync billing record as declined
    await client.query(
      `UPDATE billings
       SET payment_status = 'declined'
       WHERE order_id = $1;`,
      [id]
    );

    await client.query('COMMIT');

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const billingRes = await pool.query('SELECT invoice_number FROM billings WHERE order_id = $1', [id]);
    const orderData = updatedRes.rows[0];
    if (billingRes.rows.length > 0) {
      orderData.invoice_number = billingRes.rows[0].invoice_number;
    }

    res.status(200).json({
      status: 'success',
      message: `Payment rejected. Order status marked as Declined and stock quantity returned to inventory.`,
      data: formatOrder(orderData, itemsRes.rows)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Upload or update screenshot of proof of payment & reference number
// @route   PUT /api/orders/:id/payment-proof
// @access  Private (Customer / Admin / Staff)
const uploadPaymentProof = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const paymentProof = (req.body.paymentProof || req.body.payment_proof || '').trim();
    const paymentReference = (req.body.paymentReference || req.body.payment_reference || req.body.referenceNumber || req.body.reference || '').trim();

    if (!paymentProof && !paymentReference) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide either a screenshot of proof of payment or a reference number'
      });
    }

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const order = existing.rows[0];

    // Customer can only upload proof for their own order
    if (req.user && req.user.role === 'customer' && order.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ status: 'error', message: 'Not authorized to upload payment proof for this order' });
    }

    const newProof = paymentProof || order.payment_proof || '';
    const newRef = paymentReference || order.payment_reference || '';

    const updateSql = `
      UPDATE orders
      SET payment_proof = $1, payment_reference = $2, order_status = CASE WHEN order_status IN ('pending', 'payment_confirmation') THEN 'payment_confirmation' ELSE order_status END, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const updated = await client.query(updateSql, [newProof, newRef, id]);

    await client.query('COMMIT');

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const billingRes = await pool.query('SELECT invoice_number FROM billings WHERE order_id = $1', [id]);
    const orderData = updated.rows[0];
    if (billingRes.rows.length > 0) {
      orderData.invoice_number = billingRes.rows[0].invoice_number;
    }

    res.status(200).json({
      status: 'success',
      message: 'Proof of payment screenshot and reference updated successfully',
      data: formatOrder(orderData, itemsRes.rows)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Customer confirms order received & completed
// @route   PUT /api/orders/:id/confirm-receipt
// @access  Private (Customer / Admin / Staff)
const confirmCustomerDelivery = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const order = existing.rows[0];

    // Customer can only confirm their own order
    if (req.user && req.user.role === 'customer' && order.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ status: 'error', message: 'Not authorized to confirm this order' });
    }

    const updateSql = `
      UPDATE orders
      SET customer_confirmed = true, customer_confirmed_at = CURRENT_TIMESTAMP, order_status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const updated = await client.query(updateSql, [id]);

    await client.query('COMMIT');

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const billingRes = await pool.query('SELECT invoice_number FROM billings WHERE order_id = $1', [id]);
    const orderData = updated.rows[0];
    if (billingRes.rows.length > 0) {
      orderData.invoice_number = billingRes.rows[0].invoice_number;
    }

    res.status(200).json({
      status: 'success',
      message: 'Order delivery confirmed and marked completed! Thank you.',
      data: formatOrder(orderData, itemsRes.rows)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Cancel order and automatically restore stock inventory
// @route   PUT /api/orders/:id/cancel
// @access  Private (Customer / Admin / Staff)
const cancelOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const reason = (req.body && req.body.reason ? req.body.reason.trim() : 'Order cancelled by customer');

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const order = existing.rows[0];

    // Customer can only cancel their own order
    if (req.user && req.user.role === 'customer' && order.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ status: 'error', message: 'Not authorized to cancel this order' });
    }

    const currentStatus = (order.order_status || '').toLowerCase();
    if (currentStatus === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'Cannot cancel an order that has already been completed' });
    }

    if (currentStatus === 'cancelled' || currentStatus === 'declined' || currentStatus === 'rejected') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'Order is already cancelled or rejected' });
    }

    // Restore stock quantity to inventory
    const itemsRes = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
    for (const item of itemsRes.rows) {
      if (item.product_id) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1, is_available = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    const updateSql = `
      UPDATE orders
      SET order_status = 'cancelled', decline_reason = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const updated = await client.query(updateSql, [reason, id]);

    // Sync billing record
    await client.query(
      `UPDATE billings SET payment_status = 'failed' WHERE order_id = $1`,
      [id]
    );

    await client.query('COMMIT');

    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const billingRes = await pool.query('SELECT invoice_number FROM billings WHERE order_id = $1', [id]);
    const orderData = updated.rows[0];
    if (billingRes.rows.length > 0) {
      orderData.invoice_number = billingRes.rows[0].invoice_number;
    }

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully and product inventory has been restored.',
      data: formatOrder(orderData, items.rows)
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
  updateOrderStatus,
  verifyOrderPayment,
  declineOrderPayment,
  uploadPaymentProof,
  confirmCustomerDelivery,
  cancelOrder
};
