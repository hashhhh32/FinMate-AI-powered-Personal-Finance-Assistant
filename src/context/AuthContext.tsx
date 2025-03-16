
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

// Define types
type User = {
  id: string;
  email: string;
  name?: string;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    // Mock checking for a stored user in localStorage
    const storedUser = localStorage.getItem("finmate_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("finmate_user");
      }
    }
    setLoading(false);
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      // Mock authentication - would be replaced with Supabase
      if (email && password) {
        // For demo, we'll accept any non-empty email/password
        const mockUser = {
          id: "user-123",
          email,
          name: email.split('@')[0]
        };
        
        localStorage.setItem("finmate_user", JSON.stringify(mockUser));
        setUser(mockUser);
        toast.success("Successfully signed in!");
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign in";
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      // Mock registration - would be replaced with Supabase
      if (email && password) {
        const mockUser = {
          id: "user-" + Math.floor(Math.random() * 1000),
          email,
          name
        };
        
        localStorage.setItem("finmate_user", JSON.stringify(mockUser));
        setUser(mockUser);
        toast.success("Account created successfully!");
      } else {
        throw new Error("Invalid registration details");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create account";
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      // Mock sign out - would be replaced with Supabase
      localStorage.removeItem("finmate_user");
      setUser(null);
      toast.success("Signed out successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign out";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
