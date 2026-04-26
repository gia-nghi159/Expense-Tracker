import React from 'react'
import CustomPieChart from '../Charts/CustomPieChart';

const COLORS = ['#F7DB91', '#84B179', '#D97A2B'];

const FinanceOverview = ({ totalBalance, totalIncome, totalExpenses }) => {
    const balanceData = [
        { name:'Total Balance', amount: totalBalance },
        { name: 'Total Income', amount: totalIncome },
        { name: 'Total Expenses', amount: totalExpenses }
    ];
  return (
    <div className="card">
        <div className="flex items-center justify-between ">
            <h5 className="text-lg">Finance Overview</h5>
        </div>

        <CustomPieChart
            data={balanceData}
            label="Total Balance"
            totalAmount={`$${totalBalance}`}
            colors={COLORS}
            showTextAnchor
        />
    </div>
  )
}

export default FinanceOverview