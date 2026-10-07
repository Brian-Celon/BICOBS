const db = require('../config/db');

// @desc    Get dashboard summary statistics (Sales, Orders, Stock Alerts)
// @route   GET /api/dashboard/summary
// @access  Private (Admin / Staff)
const getDashboardSummary = async (req, res, next) => {
  try {
    // 1. Order counts
    const totalOrdersRes = await db.query('SELECT COUNT(*) FROM orders');
    const pendingOrdersRes = await db.query("SELECT COUNT(*) FROM orders WHERE order_status = 'pending'");
    const processingOrdersRes = await db.query("SELECT COUNT(*) FROM orders WHERE order_status = 'processing'");
    const readyOrdersRes = await db.query("SELECT COUNT(*) FROM orders WHERE order_status IN ('ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 'shipped')");
    const completedOrdersRes = await db.query("SELECT COUNT(*) FROM orders WHERE order_status = 'completed'");
    const cancelledOrdersRes = await db.query("SELECT COUNT(*) FROM orders WHERE order_status = 'cancelled'");

    // 2. Revenue calculation
    const revenueRes = await db.query(
      "SELECT COALESCE(SUM(total_amount), 0) as total_rev, COUNT(*) as paid_count FROM orders WHERE payment_status = 'paid'"
    );

    // 3. Inventory counts
    const totalProductsRes = await db.query('SELECT COUNT(*) FROM products');
    const lowStockRes = await db.query('SELECT COUNT(*) FROM products WHERE stock_quantity > 0 AND stock_quantity <= 3');
    const outOfStockRes = await db.query('SELECT COUNT(*) FROM products WHERE stock_quantity = 0');

    // 4. User counts
    const totalCustomersRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'customer'");

    // 5. Recent 5 orders
    const recentOrdersRes = await db.query(`
      SELECT o.*, u.full_name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    res.status(200).json({
      status: 'success',
      data: {
        revenue: {
          totalRevenue: parseFloat(revenueRes.rows[0].total_rev || 0),
          paidOrdersCount: parseInt(revenueRes.rows[0].paid_count || 0, 10)
        },
        orders: {
          totalOrders: parseInt(totalOrdersRes.rows[0].count, 10),
          pendingOrders: parseInt(pendingOrdersRes.rows[0].count, 10),
          processingOrders: parseInt(processingOrdersRes.rows[0].count, 10),
          readyForPickupOrders: parseInt(readyOrdersRes.rows[0].count, 10),
          completedOrders: parseInt(completedOrdersRes.rows[0].count, 10),
          cancelledOrders: parseInt(cancelledOrdersRes.rows[0].count, 10)
        },
        inventory: {
          totalProducts: parseInt(totalProductsRes.rows[0].count, 10),
          lowStockProducts: parseInt(lowStockRes.rows[0].count, 10),
          outOfStockProducts: parseInt(outOfStockRes.rows[0].count, 10)
        },
        users: {
          totalCustomers: parseInt(totalCustomersRes.rows[0].count, 10)
        },
        recentOrders: recentOrdersRes.rows.map(o => ({
          id: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name,
          customerEmail: o.customer_email,
          totalPrice: parseFloat(o.total_amount),
          orderStatus: o.order_status,
          paymentStatus: o.payment_status,
          createdAt: o.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock inventory warnings list
// @route   GET /api/dashboard/low-stock
// @access  Private (Admin / Staff)
const getLowStockAlerts = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM products WHERE stock_quantity <= 5 ORDER BY stock_quantity ASC'
    );

    res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: parseFloat(p.price),
        stockQuantity: p.stock_quantity,
        sku: p.sku,
        imageUrl: p.image_url
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getLowStockAlerts
};
