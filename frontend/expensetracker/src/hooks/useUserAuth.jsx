import { useContext, useEffect } from 'react';
import { UserContext } from '../context/userContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';

export const useUserAuth = () => {
    const { user, updateUser, clearUser } = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) return; // User already exists in context, no need to check localStorage

        let isMounted = true; // Flag to prevent state updates on unmounted component

        const fetchUserInfo = async () => {
            try{
                const response = await axiosInstance.get(API_PATHS.AUTH.GET_USER_INFO);
                
                if(isMounted && response.data) {
                    updateUser(response.data);
                }
            } catch (error) {
                console.error("Error fetching user info:", error);
                if(isMounted) {
                    clearUser();
                    navigate('/login');
                }
            }
        };
        
        fetchUserInfo();

        return () => {
            isMounted = false; // Cleanup flag on unmount
        };
    }, [updateUser, clearUser, navigate]);
};