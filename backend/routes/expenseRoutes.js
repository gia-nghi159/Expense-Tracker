const express = require('express');
 
const {
    addExpense,
    getAllExpenses,
    deleteExpense,
    downloadExpenseExcel
} = require('../controllers/expenseController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, addExpense);
router.get('/', protect, getAllExpenses);
router.delete('/:id', protect, deleteExpense);
router.get('/downloadexcel', protect, downloadExpenseExcel);

module.exports = router;