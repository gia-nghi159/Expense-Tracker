const xlsx = require('exceljs');
const Income = require('../models/Expense');

exports.addExpense = async (req , res) => {
    const userId = req.user._id;

    try{
        const {icon, category, amount, date} = req.body;
         
        if (!category || !amount || !date) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const newExpense = new Expense({
            userId,
            icon,
            category,
            amount,
            date: new Date(date)
        });

        await newExpense.save();
        res.status(201).json(newExpense);
    } catch (err) {
        res.status(500).json({ message: 'Error adding expense', error: err.message });
    }

}

exports.getAllExpenses = async (req , res) => {
    const userId = req.user._id;

    try {
        const expenses = await Expense.find({ userId }).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching expenses', error: err.message });
    }
}

exports.deleteExpense = async (req , res) => {
    try {
        await Expense.findByIdAndDelete({ _id: req.params.id, userId });
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting expense', error: err.message });
    }
}

exports.downloadExpenseExcel = async (req , res) => {
    const userId = req.user._id;

    try {
        const expenses = await Expense.find({ userId }).sort({ date: -1 });
        const data = expenses.map((item) => ([
            {
                Category: item.category,
                Amount: item.amount,
                Date: item.date
            }
        ]));

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, 'Expenses');
        xlsx.writeFile(wb, 'expenses_details.xlsx');
        res.download('expenses_details.xlsx');
    } catch (err) {
        res.status(500).json({ message: 'Error generating Excel file', error: err.message });
    }
}