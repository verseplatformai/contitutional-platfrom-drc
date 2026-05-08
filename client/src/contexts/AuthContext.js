import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  };

  const register = async (formData) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (authError) throw authError;

      let portraitUrl = null;
      if (formData.portrait) {
        const fileName = authData.user.id + '_' + Date.now() + '.jpg';
        await supabase.storage.from('portraits').upload(fileName, formData.portrait);
        const { data: urlData } = supabase.storage.from('portraits').getPublicUrl(fileName);
        portraitUrl = urlData.publicUrl;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          age_range: formData.age_range,
          profession: formData.profession,
          phone: formData.phone,
          portrait_url: portraitUrl,
          province: formData.province,
          other_residence: formData.other_residence || null,
          role: 'citizen'
        })
        .select()
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      return { success: true, data: profileData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const value = {
    user, profile, loading,
    register, login, logout,
    isAuthenticated: !!user
  };

  return React.createElement(AuthContext.Provider, { value: value }, children);
};
