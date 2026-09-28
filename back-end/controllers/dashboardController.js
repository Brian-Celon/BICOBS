const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get dashboard summary statistics (Sales, Orders, Stock Alerts)
// @route   GET /api/dashboard/summary
// @access  Private (Admin / Staff)
const getDashboardSummary = async (req, res, next) => {
  try {
    // 1. Order counts
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const processingOrders = await Order.countDocuments({ orderStatus: 'processing' });
    const readyForPickupOrders = await Order.countDocuments({ orderStatus: 'ready_for_pickup' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'completed' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });

    // 2. Revenue calculation (paid orders)
    const paidOrders = await Order.find({ isPaid: true });
    const totalRevenue = paidOrders.reduce((acc, order) => acc + order.totalPrice, 0);

    // 3. Inventory counts & alerts
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({ stockQuantity: { $gt: 0, $lte: 3 } });
    const outOfStockProducts = await Product.countDocuments({ stockQuantity: 0 });

    // 4. User counts
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // 5. Recent 5 orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      status: 'success',
      data: {
        revenue: {
          totalRevenue,
          paidOrdersCount: paidOrders.length
        },
        orders: {
          totalOrders,
          pendingOrders,
          processingOrders,
          readyForPickupOrders,
          completedOrders,
          cancelledOrders
        },
        inventory: {
          totalProducts,
          lowStockProducts,
          outOfStockProducts
        },
        users: {
          totalCustomers
        },
        recentOrders
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
    const lowStockItems = await Product.find({ stockQuantity: { $lte: 5 } }).sort({ stockQuantity: 1 });

    res.status(200).json({
      status: 'success',
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getLowStockAlerts
};
