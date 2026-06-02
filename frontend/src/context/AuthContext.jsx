import { createContext, useState, useEffect, useContext } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if the user is already logged in when the app loads
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await axiosClient.get('/auth/me');
          setUser(response.data.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to verify token on load:', error);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await axiosClient.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    setUser(user);
    setIsAuthenticated(true);
    return user;
  };

  const register = async (name, email, password) => {
    const response = await axiosClient.post('/auth/register', { name, email, password });
    const { user, accessToken, refreshToken } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    setUser(user);
    setIsAuthenticated(true);
    return user;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      // Call the API to blacklist the tokens in Redis
      await axiosClient.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and state, even if the API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
