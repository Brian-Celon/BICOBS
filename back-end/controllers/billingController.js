const Billing = require('../models/Billing');

// @desc    Get billing invoice by order ID
// @route   GET /api/billing/order/:orderId
// @access  Private
const getBillingByOrder = async (req, res, next) => {
  try {
    const billing = await Billing.findOne({ order: req.params.orderId }).populate('order');

    if (!billing) {
      return res.status(404).json({
        status: 'error',
        message: 'Billing invoice not found for this order'
      });
    }

    res.status(200).json({
      status: 'success',
      data: billing
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
    const billing = await Billing.findOne({
      invoiceNumber: req.params.invoiceNumber.toUpperCase()
    });

    if (!billing) {
      return res.status(404).json({
        status: 'error',
        message: 'Billing invoice not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: billing
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
    let query = {};

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const billings = await Billing.find(query).sort({ createdAt: -1 });

    // Calculate total revenue
    const totalRevenue = billings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    res.status(200).json({
      status: 'success',
      count: billings.length,
      totalRevenue,
      data: billings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBillingByOrder,
  getBillingByInvoiceNumber,
  getAllBillings
};
