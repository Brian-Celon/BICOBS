const db = require('../config/db');

// Helper to format billing row
const formatBilling = (b) => ({
  _id: b.id.toString(),
  id: b.id,
  order: b.order_id,
  orderId: b.order_id,
  invoiceNumber: b.invoice_number,
  customerName: b.customer_name,
  customerEmail: b.customer_email,
  customerPhone: b.customer_phone || '',
  subtotal: parseFloat(b.subtotal || 0),
  deliveryFee: parseFloat(b.shipping_fee || 0),
  shippingFee: parseFloat(b.shipping_fee || 0),
  totalAmount: parseFloat(b.total_amount),
  paymentMethod: b.payment_method,
  paymentStatus: b.payment_status,
  paymentDate: b.payment_date,
  createdAt: b.created_at
});

// @desc    Get billing invoice by order ID
// @route   GET /api/billing/order/:orderId
// @access  Private
const getBillingByOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const result = await db.query('SELECT * FROM billings WHERE order_id = $1', [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Billing invoice not found for this order'
      });
    }

    res.status(200).json({
      status: 'success',
      data: formatBilling(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get billing invoice by invoice number
// @route   GET /api/billing/invoice/:invoiceNumber
// @access  Private
const getBillingByInvoiceNumber = async (req, res, next) => {
  try {
    const { invoiceNumber } = req.params;
    const result = await db.query(
      'SELECT * FROM billings WHERE UPPER(invoice_number) = UPPER($1)',
      [invoiceNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Billing invoice not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: formatBilling(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's billing invoices
// @route   GET /api/billing/mybilling
// @access  Private
const getMyBillings = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT b.* 
       FROM billings b
       JOIN orders o ON b.order_id = o.id
       WHERE o.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    const formatted = result.rows.map(formatBilling);

    res.status(200).json({
      status: 'success',
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all billing invoice records (For accounting & reports)
// @route   GET /api/billing
// @access  Private (Admin / Staff)
const getAllBillings = async (req, res, next) => {
  try {
    const { paymentStatus } = req.query;
    let sql = 'SELECT * FROM billings WHERE 1=1';
    const params = [];

    if (paymentStatus) {
      params.push(paymentStatus);
      sql += ` AND payment_status = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await db.query(sql, params);
    const formatted = result.rows.map(formatBilling);

    const totalRevenue = formatted
      .filter(b => b.paymentStatus === 'paid')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    res.status(200).json({
      status: 'success',
      count: formatted.length,
      totalRevenue,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBillingByOrder,
  getBillingByInvoiceNumber,
  getMyBillings,
  getAllBillings
};
