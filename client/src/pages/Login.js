import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        toast.success('Connexion réussie ! Bienvenue sur MAONI.');
        navigate('/');
      } else {
        const msg = result.error || 'Email ou mot de passe incorrect';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo credentials helper
  const fillDemoCredentials = () => {
    setFormData({
      email: 'citoyen@maoni.cd',
      password: 'demo123',
      rememberMe: false
    });
  };

  return (
    <>
      <Helmet>
        <title>Connexion | MAONI v100.04</title>
        <meta name="description" content="Connectez-vous à la plateforme MAONI pour participer à la réforme constitutionnelle" />
      </Helmet>

      <div className="container" style={{ 
        paddingTop: 'var(--space-2xl)', 
        paddingBottom: 'var(--space-3xl)',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: '450px' }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <img 
              src="/images/logo-drc-map.png" 
              alt="MAONI" 
              className="logo-hero"
              style={{ height: '70px' }}
            />
          </div>

          <h2 className="form-title">
            🔐 {t('nav.login')}
          </h2>
          
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--gray-600)',
            marginBottom: 'var(--space-xl)'
          }}>
            Bienvenue sur la plateforme citoyenne
          </p>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                padding: 'var(--space-md)',
                background: '#fef2f2',
                border: '1px solid var(--error)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--error)',
                marginBottom: 'var(--space-lg)',
                textAlign: 'center'
              }}
            >
              ❌ {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('auth.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="votre@email.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('auth.password')}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Votre mot de passe"
                required
                autoComplete="current-password"
              />
              <div style={{ textAlign: 'right', marginTop: 'var(--space-sm)' }}>
                <Link to="/forgot-password" style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--drc-blue)' 
                }}>
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {/* Remember Me */}
            <div className="form-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  id="rememberMe"
                />
                <label htmlFor="rememberMe" style={{ cursor: 'pointer' }}>
                  Se souvenir de moi
                </label>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ marginTop: 'var(--space-md)' }}
            >
              {isSubmitting ? '⏳ Connexion...' : '🔑 Se connecter'}
            </motion.button>
          </form>

          {/* Demo Credentials */}
          <div style={{ 
            marginTop: 'var(--space-lg)', 
            padding: 'var(--space-md)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: 'var(--space-sm)' }}>
              🔑 Compte de démonstration
            </p>
            <button
              onClick={fillDemoCredentials}
              className="btn btn-sm"
              style={{
                background: 'var(--drc-blue)',
                color: 'white'
              }}
            >
              Remplir les identifiants démo
            </button>
          </div>

          {/* Register Link */}
          <p style={{ 
            textAlign: 'center', 
            marginTop: 'var(--space-lg)',
            color: 'var(--gray-600)'
          }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: 'var(--drc-blue)', fontWeight: 600 }}>
              {t('nav.register')}
            </Link>
          </p>

          {/* USSD Info */}
          <div style={{
            marginTop: 'var(--space-lg)',
            padding: 'var(--space-md)',
            background: 'linear-gradient(135deg, #FFF9C4, #FFF176)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            border: '1px solid var(--drc-yellow)'
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-800)', margin: 0 }}>
              📱 Sans internet ? Composez <strong>*123#</strong> pour participer
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Login;