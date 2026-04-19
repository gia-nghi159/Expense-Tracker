const express = require('express');
 
const {
    addIncome,
    getAllIncome,
    deleteIncome,
    downloadIncomeExcel
} = require('../controllers/incomeController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, addIncome);
router.get('/', protect, getAllIncome);
router.delete('/:id', protect, deleteIncome);
router.get('/downloadexcel', protect, downloadIncomeExcel);

module.exports = router;