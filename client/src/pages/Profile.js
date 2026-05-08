import React from 'react';
import { useAuth } from '../contexts/AuthContext';
const Profile = () => {
  const { profile } = useAuth();
  return <div className="container" style={{padding: '2rem'}}><h1>Mon Profil</h1><p>Bienvenue, {profile?.first_name} {profile?.last_name}</p></div>;
};
export default Profile;
