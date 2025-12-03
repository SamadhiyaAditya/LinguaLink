"use client";
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuthContext = () => {
    return useContext(AuthContext);
};

export const AuthContextProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Configure axios defaults
    // Configure axios defaults
    axios.defaults.baseURL = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api`;
    // axios.defaults.withCredentials = true; // Removed as we use JWT in body and want to allow * origin 
    // For this setup, we'll attach token manually or use an interceptor. 
    // Let's use localStorage for simplicity as per common MERN patterns, 
    // though cookies are more secure. The backend expects "Bearer <token>".

    useEffect(() => {
        const storedUser = localStorage.getItem("chat-user");
        if (storedUser) {
            setAuthUser(JSON.parse(storedUser));
        }
        setLoading(false);

        // Add a request interceptor
        const interceptor = axios.interceptors.request.use(
            config => {
                const user = localStorage.getItem("chat-user");
                if (user) {
                    const token = JSON.parse(user).token;
                    if (token) {
                        config.headers['Authorization'] = 'Bearer ' + token;
                    }
                }
                return config;
            },
            error => {
                return Promise.reject(error);
            }
        );

        // Cleanup interceptor on unmount
        return () => {
            axios.interceptors.request.eject(interceptor);
        };
    }, []);

    const login = async (username, password) => {
        try {
            const res = await axios.post("/auth/login", { username, password });
            if (res.data.error) {
                throw new Error(res.data.error);
            }
            localStorage.setItem("chat-user", JSON.stringify(res.data));
            setAuthUser(res.data);
            return res.data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const signup = async ({ username, email, password, confirmPassword, nativeLanguage }) => {
        try {
            const res = await axios.post("/auth/signup", {
                username, email, password, confirmPassword, nativeLanguage
            });
            if (res.data.error) {
                throw new Error(res.data.error);
            }
            localStorage.setItem("chat-user", JSON.stringify(res.data));
            setAuthUser(res.data);
            return res.data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await axios.post("/auth/logout");
            localStorage.removeItem("chat-user");
            setAuthUser(null);
        } catch (error) {
            console.error(error);
        }
    };

    return <AuthContext.Provider value={{ authUser, setAuthUser, login, signup, logout, loading }}>{children}</AuthContext.Provider>;
};
