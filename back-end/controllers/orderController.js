const { pool } = require('../config/db');

// Helper to format an order row and its items
const formatOrder = (orderRow, items = []) => {
  let cashierName = 'Store Cashier';
  if (orderRow.notes) {
    const match = orderRow.notes.match(/Cashier:\s*([^|]+)/i);
    if (match && match[1]) {
      cashierName = match[1].trim();
    }
  }
  if (cashierName === 'Store Cashier' && (orderRow.user_name || orderRow.userName)) {
    cashierName = (orderRow.user_name || orderRow.userName).trim();
  }

  return {
    _id: orderRow.id.toString(),
    id: orderRow.id,
    orderNumber: orderRow.order_number,
    order_number: orderRow.order_number,
    invoiceNumber: orderRow.invoice_number || null,
    invoice_number: orderRow.invoice_number || null,
    user: orderRow.user_id,
    userName: orderRow.user_name || null,
    user_name: orderRow.user_name || null,
    customerName: orderRow.customer_name,
    customerEmail: orderRow.customer_email,
    customerPhone: orderRow.customer_phone,
    deliveryType: orderRow.delivery_type,
    deliveryAddress: orderRow.delivery_address,
    notes: orderRow.notes,
    cashierName,
    cashier_name: cashierName,
    cashier: cashierName,
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
  };
};

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
        subtotal, shipping_fee, total_amount, order_status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 'pending')
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
      totalPrice
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

// @desc    Process counter POS walk-in sale
// @route   POST /api/orders/pos
// @access  Public / Staff Counter
const createPosOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      customerName = 'Walk-in Customer',
      customerPhone = '',
      paymentMethod = 'cash',
      amountTendered = 0,
      changeDue = 0,
      paymentReference = '',
      discountAmount = 0,
      discountNote = '',
      notes = '',
      cashierName: clientCashierName,
      orderItems = []
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No items in order cart'
      });
    }

    // Cashier identity comes from the verified JWT session, not the request body
    const cashierName = (req.user && req.user.name) || clientCashierName || 'Store Cashier';
    const cashierUserId = req.user.id;

    await client.query('BEGIN');

    // 1. Process items, check stock, and deduct product inventory
    let subtotal = 0;
    const processedItems = [];
    const repairTickets = [];

    for (const item of orderItems) {
      const isService = Boolean(item.isService || item.is_service);
      const reqQty = parseInt(item.quantity || item.qty || 1, 10);
      const unitPrice = parseFloat(item.price || item.unit_price || 0);
      const itemSubtotal = unitPrice * reqQty;
      subtotal += itemSubtotal;

      const prodId = item.productId || item.product_id || item.id;
      if (!isService && prodId) {
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
        if (product.stock_quantity < reqQty) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            status: 'error',
            message: `Insufficient stock for '${product.name}'. Available: ${product.stock_quantity}, Requested: ${reqQty}`
          });
        }

        // Deduct inventory
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [reqQty, product.id]
        );

        processedItems.push({
          productId: product.id,
          name: product.name,
          quantity: reqQty,
          price: unitPrice,
          subtotal: itemSubtotal,
          isService: false
        });
      } else {
        // Service / Maintenance item
        processedItems.push({
          productId: null,
          name: item.name || 'Bicycle Maintenance Service',
          quantity: reqQty,
          price: unitPrice,
          subtotal: itemSubtotal,
          isService: true
        });

        repairTickets.push({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          bikeModel: item.bikeDetails || 'Walk-in Bicycle',
          mechanicName: item.mechanic || 'Reynaldo',
          serviceType: item.name || 'General Tune-Up',
          problemDescription: item.serviceNotes || (notes ? `POS Note: ${notes}` : ''),
          estimatedCost: unitPrice * reqQty
        });
      }
    }

    // Server-side guard: discount can never be negative or exceed the subtotal
    const discount = Math.min(Math.max(0, parseFloat(discountAmount || 0)), subtotal);
    const finalTotal = Math.max(0, subtotal - discount);

    // Format notes with cashier and payment metadata
    const posNotes = [
      notes,
      discountNote ? `Discount: ${discountNote} (-₱${discount.toFixed(2)})` : '',
      paymentMethod.toLowerCase() === 'cash' ? `Tendered: ₱${parseFloat(amountTendered || 0).toFixed(2)}, Change: ₱${parseFloat(changeDue || 0).toFixed(2)}` : '',
      paymentReference ? `Ref Code: ${paymentReference}` : '',
      `Cashier: ${cashierName}`
    ].filter(Boolean).join(' | ');

    // Generate unique order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-POS-${dateStr}-${randomSuffix}`;
    const invoiceNumber = `INV-POS-${dateStr}-${randomSuffix}`;


    // 2. Insert into orders table
    const insertOrderSql = `
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        delivery_type, delivery_address, notes, payment_method,
        subtotal, shipping_fee, total_amount, order_status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, 'pickup', 'Taurus In-Store Counter', $6, $7, $8, 0, $9, 'completed', 'paid')
      RETURNING *;
    `;

    const orderRes = await client.query(insertOrderSql, [
      orderNumber,
      cashierUserId,
      customerName.trim() || 'Walk-in Customer',
      'pos@taurusbike.ph',
      customerPhone.trim() || 'Walk-in',
      posNotes,
      paymentMethod.toLowerCase(),
      subtotal,
      finalTotal
    ]);

    const createdOrder = orderRes.rows[0];

    // 3. Insert order items
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [createdOrder.id, item.productId, item.name, item.quantity, item.price, item.subtotal]
      );
    }

    // 4. Insert billing / invoice record
    await client.query(
      `INSERT INTO billings (
        order_id, invoice_number, customer_name, customer_email, customer_phone,
        subtotal, shipping_fee, total_amount, payment_method, payment_status, payment_date
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, 'paid', CURRENT_TIMESTAMP);`,
      [
        createdOrder.id,
        invoiceNumber,
        createdOrder.customer_name,
        createdOrder.customer_email,
        createdOrder.customer_phone,
        subtotal,
        finalTotal,
        paymentMethod.toLowerCase()
      ]
    );

    // 5. Insert repair tickets if service items were present
    const createdRepairs = [];
    for (const rep of repairTickets) {
      const lastRes = await client.query("SELECT ticket_number FROM repairs ORDER BY id DESC LIMIT 1");
      let nextNum = 11;
      if (lastRes.rows.length > 0) {
        const match = (lastRes.rows[0].ticket_number || '').match(/\d+/);
        if (match) nextNum = parseInt(match[0], 10) + 1;
      }
      const ticketNumber = `#R${String(nextNum).padStart(3, '0')}`;

      const repRes = await client.query(
        `INSERT INTO repairs (
          ticket_number, order_id, user_id, customer_name, customer_phone,
          bike_model, mechanic_name, service_type, problem_description,
          status, estimated_cost, estimated_finish
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in-progress', $10, 'Today')
        RETURNING *;`,
        [
          ticketNumber,
          createdOrder.id,
          cashierUserId,
          rep.customerName,
          rep.customerPhone,
          rep.bikeModel,
          rep.mechanicName,
          rep.serviceType,
          rep.problemDescription,
          rep.estimatedCost
        ]
      );
      createdRepairs.push(repRes.rows[0]);
    }

    await client.query('COMMIT');

    createdOrder.invoice_number = invoiceNumber;

    res.status(201).json({
      status: 'success',
      message: 'Walk-in order processed successfully',
      data: {
        order: formatOrder(createdOrder, processedItems.map(p => ({
          id: p.productId,
          product_id: p.productId,
          product_name: p.name,
          quantity: p.quantity,
          unit_price: p.price,
          subtotal: p.subtotal
        }))),
        invoiceNumber,
        repairs: createdRepairs,
        payment: {
          method: paymentMethod,
          amountTendered: parseFloat(amountTendered || 0),
          changeDue: parseFloat(changeDue || 0),
          paymentReference
        },
        cashier: cashierName
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Get walk-in POS orders for history ledger
// @route   GET /api/orders/pos
// @access  Public / Staff Counter
const getPosOrders = async (req, res, next) => {
  try {
    const sql = `
      SELECT o.*, b.invoice_number, u.full_name as user_name
      FROM orders o
      LEFT JOIN billings b ON b.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.order_number LIKE 'ORD-POS-%'
      ORDER BY o.created_at DESC
      LIMIT 100
    `;
    const ordersRes = await pool.query(sql);
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

// @desc    Get POS daily shift metrics and recent sales
// @route   GET /api/orders/pos/summary
// @access  Public / Staff Counter
const getPosSummary = async (req, res, next) => {
  try {
    const todayRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS today_sales,
        COUNT(*) AS today_orders_count
      FROM orders
      WHERE payment_status = 'paid'
        AND order_number LIKE 'ORD-POS-%'
        AND DATE(created_at AT TIME ZONE 'Asia/Manila') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')
    `);

    const allTimeRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COUNT(*) AS total_orders_count
      FROM orders
      WHERE payment_status = 'paid' AND order_number LIKE 'ORD-POS-%'
    `);

    const recentRes = await pool.query(`
      SELECT o.id, o.order_number, o.customer_name, o.payment_method, o.total_amount, o.created_at, b.invoice_number
      FROM orders o
      LEFT JOIN billings b ON b.order_id = o.id
      WHERE o.order_number LIKE 'ORD-POS-%'
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    const recentOrders = [];
    for (const r of recentRes.rows) {
      const itemsRes = await pool.query('SELECT product_name, quantity FROM order_items WHERE order_id = $1', [r.id]);
      const itemsDesc = itemsRes.rows.map(i => `${i.product_name} (x${i.quantity})`).join(', ');
      recentOrders.push({
        id: r.id,
        orderNumber: r.order_number,
        invoiceNumber: r.invoice_number,
        customerName: r.customer_name,
        paymentMethod: r.payment_method,
        totalAmount: parseFloat(r.total_amount),
        createdAt: r.created_at,
        itemsCount: itemsRes.rows.reduce((sum, i) => sum + i.quantity, 0),
        itemsSummary: itemsDesc || '1 item'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        todaySales: parseFloat(todayRes.rows[0].today_sales || 0),
        todayOrdersCount: parseInt(todayRes.rows[0].today_orders_count || 0, 10),
        totalSales: parseFloat(allTimeRes.rows[0].total_sales || 0),
        totalOrdersCount: parseInt(allTimeRes.rows[0].total_orders_count || 0, 10),
        recentOrders
      }
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
  updateOrderStatus,
  createPosOrder,
  getPosOrders,
  getPosSummary
};
