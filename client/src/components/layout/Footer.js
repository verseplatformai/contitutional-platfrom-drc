import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const [deployTime, setDeployTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDeployTime(now.toLocaleString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Africa/Kinshasa'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="footer" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#ccc', padding: '3rem 0 1.5rem', borderTop: '5px solid #FFD700' }}>
      <div className="container">
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* MAONI */}
          <div>
            <h4 style={{ color: 'white', fontFamily: 'Georgia, serif', marginBottom: '1rem', borderBottom: '2px solid #FFD700', paddingBottom: '0.5rem', display: 'inline-block' }}>MAONI</h4>
            <p style={{ color: '#aaa', lineHeight: 1.8, fontSize: '0.9rem' }}>
              Plateforme nationale de consultation citoyenne pour la réforme constitutionnelle en République Démocratique du Congo. La voix de 80 millions de Congolais.
            </p>
            <img src="/images/logo-drc-map.png" alt="DRC" style={{ height: '50px', marginTop: '0.5rem' }} />
          </div>

          {/* ENTREPRISE */}
          <div>
            <h4 style={{ color: 'white', fontFamily: 'Georgia, serif', marginBottom: '1rem', borderBottom: '2px solid #FFD700', paddingBottom: '0.5rem', display: 'inline-block' }}>Entreprise</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><Link to="/" style={{ color: '#aaa', textDecoration: 'none', display: 'block', padding: '0.3rem 0', transition: 'color 0.3s' }}>Accueil</Link></li>
              <li><Link to="/proposals" style={{ color: '#aaa', textDecoration: 'none', display: 'block', padding: '0.3rem 0' }}>Propositions</Link></li>
              <li><Link to="/statistics" style={{ color: '#aaa', textDecoration: 'none', display: 'block', padding: '0.3rem 0' }}>Statistiques</Link></li>
              <li><Link to="/terms" style={{ color: '#aaa', textDecoration: 'none', display: 'block', padding: '0.3rem 0' }}>Conditions d'utilisation</Link></li>
              <li><Link to="/privacy" style={{ color: '#aaa', textDecoration: 'none', display: 'block', padding: '0.3rem 0' }}>Politique de confidentialité</Link></li>
            </ul>
          </div>

          {/* RESSOURCES */}
          <div>
            <h4 style={{ color: 'white', fontFamily: 'Georgia, serif', marginBottom: '1rem', borderBottom: '2px solid #FFD700', paddingBottom: '0.5rem', display: 'inline-block' }}>Ressources</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><a href="https://web.facebook.com/MaoniRDC" target="_blank" rel="noopener noreferrer" style={{ color: '#aaa', textDecoration: 'none', display: 'block', padding: '0.3rem 0' }}>📘 Facebook</a></li>
              <li><a href="#" style={{ color: '#aaa', textDecoration: 'none', display: 'block', padding: '0.3rem 0' }}>💬 WhatsApp</a></li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h4 style={{ color: 'white', fontFamily: 'Georgia, serif', marginBottom: '1rem', borderBottom: '2px solid #FFD700', paddingBottom: '0.5rem', display: 'inline-block' }}>Contact</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ color: '#aaa', padding: '0.3rem 0' }}>📍 Kinshasa, RDC</li>
              <li style={{ color: '#aaa', padding: '0.3rem 0' }}>📧 contact@maoni.cd</li>
              <li style={{ color: '#aaa', padding: '0.3rem 0' }}>📞 +243 800 000 000</li>
            </ul>
          </div>
        </div>

        {/* BOTTOM */}
        <div style={{ textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: '0.85rem', color: '#888' }}>
            Dernière mise à jour : {deployTime} (Heure de Kinshasa)
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: '#FFD700', fontWeight: 600 }}>🇨🇩 Fabriqué en RDC</span> | 
            © {new Date().getFullYear()} MAONI - Tous droits réservés | 
            www.maoni.cd
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;