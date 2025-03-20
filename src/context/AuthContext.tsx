import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

// Define types
type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  getUserName: () => string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to get user name from metadata
  const getUserName = () => {
    if (!user) return "";
    
    // Try to get name from user_metadata
    const name = user.user_metadata?.name || user.user_metadata?.full_name;
    
    // Fallback to email
    if (!name) {
      return user.email?.split('@')[0] || "User";
    }
    
    return name;
  };

  // Check for existing session on mount
  useEffect(() => {
    const setData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    setData();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Successfully signed in!");
    } catch (error: any) {
      const message = error?.message || "Failed to sign in";
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

      // Validate inputs
      if (!email || !password || !name) {
        throw new Error('Please fill in all fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Sign up the user with metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            avatar_url: null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists');
        } else if (error.message.includes('Password')) {
          throw new Error('Password must be at least 6 characters long');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many attempts. Please try again later.');
        } else if (error.message.includes('Database error')) {
          // Log the full error for debugging but show a user-friendly message
          console.error('Database error details:', error);
          throw new Error('Unable to create account. Please try again in a few minutes.');
        }
        
        throw error;
      }

      if (!data?.user) {
        throw new Error('Failed to create user account');
      }

      // Check if email confirmation is required
      if (data?.session === null) {
        toast.success("Please check your email to confirm your account");
      } else {
        toast.success("Account created successfully!");
      }

      return { user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Create a user-friendly error message
      let message = 'Failed to create account';
      
      if (error?.message) {
        message = error.message;
      }
      
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      const message = error?.message || "Failed to sign out";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    getUserName,
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
