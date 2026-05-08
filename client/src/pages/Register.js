import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const PROVINCES = [
  'Kinshasa', 'Nord-Kivu', 'Sud-Kivu', 'Ituri', 'Haut-Uélé',
  'Tshopo', 'Bas-Uélé', 'Équateur', 'Sud-Ubangi', 'Nord-Ubangi',
  'Mongala', 'Tshuapa', 'Maniema', 'Kasaï', 'Kasaï-Central',
  'Kasaï-Oriental', 'Lomami', 'Sankuru', 'Tanganyika', 'Haut-Lomami',
  'Lualaba', 'Haut-Katanga', 'Kwango', 'Kwilu', 'Mai-Ndombe', 'Kongo Central'
];

const AGE_RANGES = [
  '18-25 ans',
  '26-35 ans',
  '36-45 ans',
  '46-55 ans',
  '56-65 ans',
  '66 ans et plus'
];

const Register = () => {
  const { t } = useTranslation();
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age_range: '',
    profession: '',
    phone: '',
    province: '',
    diaspora: false,
    other_residence: '',
    portrait: null,
    acceptTerms: false
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [portraitPreview, setPortraitPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      setFormData(prev => ({ ...prev, portrait: file }));
      
      // Create preview
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setPortraitPreview(reader.result);
        reader.readAsDataURL(file);
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Le prénom est obligatoire';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Le nom est obligatoire';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est obligatoire';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est obligatoire';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!formData.age_range) {
      newErrors.age_range = 'Veuillez sélectionner votre tranche d\'âge';
    }

    if (!formData.profession.trim()) {
      newErrors.profession = 'La profession est obligatoire';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le numéro de téléphone est obligatoire';
    }

    if (!formData.province) {
      newErrors.province = 'Veuillez sélectionner votre province';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Vous devez accepter les conditions d\'utilisation';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await register(formData);

      if (result.success) {
        toast.success('Inscription réussie ! Bienvenue dans la communauté MAONI.');
        navigate('/');
      } else {
        const msg = result.error || 'Une erreur est survenue lors de l\'inscription';
        setSubmitError(msg);
        toast.error(msg);
      }
    } catch (error) {
      setSubmitError('Erreur de connexion. Veuillez réessayer.');
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Inscription | MAONI v100.04</title>
      </Helmet>

      <div className="container" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-3xl)' }}>
        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <img 
              src="/images/logo-drc-map.png" 
              alt="MAONI" 
              className="logo-hero"
              style={{ height: '80px' }}
            />
          </div>

          <h2 className="form-title">
            🇨🇩 {t('nav.register')}
          </h2>
          
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--gray-600)',
            marginBottom: 'var(--space-xl)'
          }}>
            Rejoignez la plateforme citoyenne pour la réforme constitutionnelle
          </p>

          {/* Error Message */}
          {submitError && (
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
              ❌ {submitError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Name Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label form-required">
                  {t('auth.firstName')}
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`form-input ${errors.first_name ? 'error' : ''}`}
                  placeholder="Votre prénom"
                />
                {errors.first_name && <div className="form-error">{errors.first_name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label form-required">
                  {t('auth.lastName')}
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`form-input ${errors.last_name ? 'error' : ''}`}
                  placeholder="Votre nom"
                />
                {errors.last_name && <div className="form-error">{errors.last_name}</div>}
              </div>
            </div>

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
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="votre@email.com"
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            {/* Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label form-required">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Minimum 6 caractères"
                />
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>

              <div className="form-group">
                <label className="form-label form-required">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Répétez le mot de passe"
                />
                {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
              </div>
            </div>

            {/* Age Range */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('auth.age')}
              </label>
              <select
                name="age_range"
                value={formData.age_range}
                onChange={handleChange}
                className={`form-select ${errors.age_range ? 'error' : ''}`}
              >
                <option value="">Sélectionnez votre tranche d'âge</option>
                {AGE_RANGES.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
              {errors.age_range && <div className="form-error">{errors.age_range}</div>}
            </div>

            {/* Profession */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('auth.profession')}
              </label>
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleChange}
                className={`form-input ${errors.profession ? 'error' : ''}`}
                placeholder="Votre profession"
              />
              {errors.profession && <div className="form-error">{errors.profession}</div>}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('auth.phone')}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`form-input ${errors.phone ? 'error' : ''}`}
                placeholder="+243 XX XXX XXXX"
              />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>

            {/* Province */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('auth.province')}
              </label>
              <select
                name="province"
                value={formData.province}
                onChange={handleChange}
                className={`form-select ${errors.province ? 'error' : ''}`}
              >
                <option value="">Sélectionnez votre province</option>
                {PROVINCES.map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
              {errors.province && <div className="form-error">{errors.province}</div>}
            </div>

            {/* Diaspora */}
            <div className="form-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  name="diaspora"
                  checked={formData.diaspora}
                  onChange={handleChange}
                  id="diaspora"
                />
                <label htmlFor="diaspora" style={{ cursor: 'pointer' }}>
                  {t('auth.diaspora')}
                </label>
              </div>
            </div>

            {/* Other Residence (if diaspora) */}
            {formData.diaspora && (
              <motion.div
                className="form-group"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="form-label">
                  Pays de résidence
                </label>
                <input
                  type="text"
                  name="other_residence"
                  value={formData.other_residence}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: Belgique, France, Canada..."
                />
              </motion.div>
            )}

            {/* Portrait Upload */}
            <div className="form-group">
              <label className="form-label">
                Photo de profil (optionnelle)
              </label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-md)' 
              }}>
                {portraitPreview && (
                  <img 
                    src={portraitPreview} 
                    alt="Preview" 
                    className="avatar-lg avatar-image"
                  />
                )}
                <input
                  type="file"
                  name="portrait"
                  onChange={handleChange}
                  accept="image/*"
                  className="form-input"
                  style={{ padding: '0.5rem' }}
                />
              </div>
              <div className="form-help">
                Formats acceptés : JPG, PNG. Taille max : 5 MB
              </div>
            </div>

            {/* Terms Acceptance */}
            <div className="form-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  id="acceptTerms"
                />
                <label htmlFor="acceptTerms" style={{ cursor: 'pointer' }}>
                  {t('auth.terms')}
                </label>
              </div>
              {errors.acceptTerms && <div className="form-error">{errors.acceptTerms}</div>}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ marginTop: 'var(--space-lg)' }}
            >
              {isSubmitting ? '⏳ Inscription en cours...' : '✅ Créer mon compte'}
            </motion.button>
          </form>

          {/* Login Link */}
          <p style={{ 
            textAlign: 'center', 
            marginTop: 'var(--space-lg)',
            color: 'var(--gray-600)'
          }}>
            Déjà inscrit ?{' '}
            <Link to="/login" style={{ color: 'var(--drc-blue)', fontWeight: 600 }}>
              Connectez-vous
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default Register;