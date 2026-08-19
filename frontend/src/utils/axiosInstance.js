import axios from 'axios';
import { API_BASE_URL } from './apiPaths';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if(error.response) {
            if (error.response.status === 500) {
                console.error("Server error");
            }
        } else if (error.code === 'ECONNABORTED') {
            console.error("Request timeout");
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;