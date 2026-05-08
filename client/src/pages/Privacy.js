import React from 'react';
import { Helmet } from 'react-helmet-async';

const Privacy = () => {
  return (
    <>
      <Helmet><title>Politique de Confidentialité | MAONI</title></Helmet>
      <div className="container" style={{ padding: '3rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', textAlign: 'center', marginBottom: '2rem' }}>Politique de Confidentialité – Application MAONI</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Dernière mise à jour : 05 Mai 2026</p>
        
        <div style={{ lineHeight: 1.8, color: '#444' }}>
          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>1. Responsable du traitement</h3>
          <p>Le responsable du traitement est l'équipe MAONI. Contact : contact@maoni.cd</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>2. Cadre juridique applicable</h3>
          <p>Les traitements respectent les principes de protection des données de la RDC et les standards internationaux (RGPD pour les utilisateurs de l'UE).</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>3. Données collectées</h3>
          <p><strong>Données fournies :</strong> Nom, coordonnées, opinions politiques, données socio-démographiques (facultatives).</p>
          <p><strong>Données automatiques :</strong> Adresse IP, données techniques, données d'usage.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>4. Base légale</h3>
          <p>Consentement explicite, intérêt légitime, mission d'intérêt public.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>5. Finalités</h3>
          <p>Organisation de sondages citoyens, analyse statistique, contribution au débat démocratique, amélioration du service, sécurité.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>6. Conservation</h3>
          <p>Données personnelles : 12-36 mois. Données anonymisées : conservation plus longue à des fins statistiques.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>7. Partage des données</h3>
          <p>Uniquement avec prestataires techniques, institutions ou chercheurs, ou si requis par la loi.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>8. Sécurité</h3>
          <p>Chiffrement SSL/TLS, contrôle d'accès strict, journalisation, minimisation des données.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>9. Vos droits</h3>
          <p>Droit d'accès, de rectification, d'opposition, d'effacement, de limitation, de portabilité, de retrait du consentement.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>10. Contact</h3>
          <p>Pour toute question : 📧 contact@maoni.cd</p>
        </div>
      </div>
    </>
  );
};

export default Privacy;