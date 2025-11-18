import React from 'react';
import './auth.css';

const Home = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand">LinguaLink</div>
          <h2 className="auth-title">Welcome Home!</h2>
          <p className="auth-subtitle">You have successfully logged in</p>
        </div>
      </div>
    </div>
  );
};

export default Home;