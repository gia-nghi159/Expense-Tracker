export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_PATHS = {
    USERS: {
        LIST: '/api/v1/users',
        CREATE: '/api/v1/users',
        GET: (id) => `/api/v1/users/${id}`,
    },
    GROUPS: {
        LIST: '/api/v1/groups',
        CREATE: '/api/v1/groups',
        QUICK_CREATE: '/api/v1/groups/quick-create',
        GET: (id) => `/api/v1/groups/${id}`,
        DELETE: (id) => `/api/v1/groups/${id}`,
        ADD_MEMBER: (id) => `/api/v1/groups/${id}/members`,
        REMOVE_MEMBER: (groupId, userId) => `/api/v1/groups/${groupId}/members/${userId}`,
    },
    EXPENSES: {
        INGEST: '/api/v1/expenses/ingest',
        LIST_GROUP: (groupId) => `/api/v1/expenses/group/${groupId}`,
        DELETE: (expenseId) => `/api/v1/expenses/${expenseId}`,
        EDIT: (expenseId) => `/api/v1/expenses/${expenseId}`,
    },
    GRAPH: {
        NETWORK: (groupId) => `/api/v1/graph/network/${groupId}`,
        SIMPLIFY: (groupId) => `/api/v1/graph/simplify/${groupId}`,
    },
    SETTLEMENTS: {
        RECORD: '/api/v1/settlements/record',
    },
    SEED: '/api/v1/seed',
    HEALTH: '/health',
};