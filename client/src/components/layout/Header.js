import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner container">
        {/* Logo and Brand */}
        <Link to="/" className="navbar-brand">
          <img 
            src="/images/logo-drc-map.png" 
            alt="MAONI Logo" 
            className="logo-navbar"
          />
          <span className="navbar-brand-text">
            MA<span style={{ color: 'var(--drc-yellow)' }}>O</span>NI
          </span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button 
          className="navbar-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation Links */}
        <nav className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `navbar-link ${isActive ? 'active' : ''}`
            }
            end
            onClick={() => setMobileMenuOpen(false)}
          >
            🏠 {t('nav.home')}
          </NavLink>
          
          <NavLink 
            to="/proposals" 
            className={({ isActive }) => 
              `navbar-link ${isActive ? 'active' : ''}`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            📋 {t('nav.proposals')}
          </NavLink>
          
          <NavLink 
            to="/statistics" 
            className={({ isActive }) => 
              `navbar-link ${isActive ? 'active' : ''}`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            📊 {t('nav.statistics')}
          </NavLink>

          <LanguageSwitcher />

          {isAuthenticated ? (
            <>
              <NavLink 
                to="/profile" 
                className="navbar-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img 
                  src={profile?.portrait_url || '/images/default-avatar.png'} 
                  alt="Profile" 
                  className="avatar-sm avatar-image"
                  style={{ marginRight: '0.5rem' }}
                />
                {profile?.first_name}
              </NavLink>
              
              <button 
                onClick={handleLogout}
                className="btn btn-sm"
                style={{ 
                  background: 'transparent', 
                  color: 'white', 
                  border: '1px solid rgba(255,255,255,0.3)' 
                }}
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <NavLink 
                to="/login" 
                className="navbar-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.login')}
              </NavLink>
              
              <Link 
                to="/register" 
                className="navbar-link navbar-cta"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.register')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;