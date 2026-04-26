import moment from "moment";

export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

export const getInitials = (name) => {
    if (!name) return "";

    const words = name.split(" ");
    let initials = "";

    for(let i = 0; i < Math.min(2, words.length); i++) {
        initials += words[i][0];
    }
    
    return initials.toUpperCase();
};

export const addThousandsSeparator = (num) => {
    if(num == null || isNaN(num)) return "";

    const [integerPart, fractionalPart] = num.toString().split(".");
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ","); 

    return fractionalPart ? `${formattedInteger}.${fractionalPart}` : formattedInteger;
};

export const prepareExpenseBarChartData = (data = []) => {
    // sort from oldest to newest
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const chartData = [];
    sortedData.forEach((item) => {
        const dateStr = moment(item?.date).format("Do MMM");
        const existing = chartData.find(d => d.month === dateStr);
        if (existing) {
            existing.amount += item.amount;
        } else {
            chartData.push({ month: dateStr, amount: item.amount, category: item.category });
        }
    });
    return chartData;
};

export const prepareIncomeBarChartData = (data = []) => {
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    const chartData = [];
    sortedData.forEach((item) => {
        const dateStr = moment(item?.date).format("Do MMM");
        const existing = chartData.find(d => d.month === dateStr);
        if (existing) {
            existing.amount += item.amount;
        } else {
            chartData.push({ month: dateStr, amount: item.amount, source: item.source });
        }
    });
    return chartData;
};

export const prepareExpenseLineChartData = (data = []) => {
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    const chartData = sortedData.map((item) => ({
        month: moment(item?.date).format("Do MMM"),
        amount: item?.amount,
        category: item?.category,
    }));
    return chartData;
};