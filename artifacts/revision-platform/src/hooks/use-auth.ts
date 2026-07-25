import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('scholr_auth') === 'true';
  });

  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('onboarded') === 'true';
  });

  const [, setLocation] = useLocation();

  const login = () => {
    localStorage.setItem('scholr_auth', 'true');
    setIsAuthenticated(true);
    
    if (localStorage.getItem('onboarded') === 'true') {
      setLocation('/dashboard');
    } else {
      setLocation('/onboarding');
    }
  };

  const logout = () => {
    localStorage.removeItem('scholr_auth');
    setIsAuthenticated(false);
    setLocation('/login');
  };

  const completeOnboarding = () => {
    localStorage.setItem('onboarded', 'true');
    setIsOnboarded(true);
    setLocation('/dashboard');
  };

  return {
    isAuthenticated,
    isOnboarded,
    login,
    logout,
    completeOnboarding
  };
}
