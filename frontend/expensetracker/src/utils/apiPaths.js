export const API_BASE_URL = 'http://localhost:8000';

export const API_PATHS = {
    AUTH: {
        LOGIN: '/api/v1/auth/login',
        REGISTER: '/api/v1/auth/register',
        GET_USER_INFO: '/api/v1/auth/getUser', 
    },
    DASHBOARD: {
        GET_DATA: '/api/v1/dashboard',
    },
    INCOME: {
        ADD_INCOME: '/api/v1/income',
        GET_ALL_INCOME: '/api/v1/income',
        DELETE_INCOME: (incomeId) => `/api/v1/income/${incomeId}`,
        DOWNLOAD_INCOME: '/api/v1/income/downloadexcel', 
    },
    EXPENSE: {
        ADD_EXPENSE: '/api/v1/expense',
        GET_ALL_EXPENSE: '/api/v1/expense',
        DELETE_EXPENSE: (expenseId) => `/api/v1/expense/${expenseId}`,
        DOWNLOAD_EXPENSE: '/api/v1/expense/downloadexcel', 
    },
    IMAGE: {
        UPLOAD_IMAGE: '/api/v1/auth/upload-image',
    }
}