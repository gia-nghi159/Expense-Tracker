const xlsx = require('xlsx');
const Income = require('../models/Income');

exports.addIncome = async (req , res) => {
    const userId = req.user._id;

    try{
        const {icon, source, amount, date} = req.body;
         
        if (!source || !amount || !date) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const newIncome = new Income({
            userId,
            icon,
            source,
            amount,
            date: new Date(date)
        });

        await newIncome.save();
        res.status(201).json(newIncome);
    } catch (err) {
        res.status(500).json({ message: 'Error adding income', error: err.message });
    }

}

exports.getAllIncome = async (req , res) => {
    const userId = req.user._id;

    try {
        const income = await Income.find({ userId }).sort({ date: -1 });
        res.json(income);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching income', error: err.message });
    }
}

exports.deleteIncome = async (req , res) => {

    const userId = req.user._id;

    try {
        await Income.findOneAndDelete({ _id: req.params.id, userId });
        res.json({ message: 'Income deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting income', error: err.message });
    }
}

exports.downloadIncomeExcel = async (req , res) => {
    const userId = req.user._id;

    try {
        const income = await Income.find({ userId }).sort({ date: -1 });
        const data = income.map((item) => ({
            Source: item.source,
            Amount: item.amount,
            Date: item.date
        }));

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, 'Incomes');
        xlsx.writeFile(wb, 'incomes_details.xlsx');
        res.download('incomes_details.xlsx');
    } catch (err) {
        res.status(500).json({ message: 'Error generating Excel file', error: err.message });
    }
}