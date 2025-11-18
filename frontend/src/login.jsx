import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import './auth.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post('https://lingualink-9km6.onrender.com/api/auth/login', {
        email,
        password
      })

      console.log(' Login Response:', response.data)

      if (response.data.success) {
        toast.success('Logged in successfully!')
        localStorage.setItem('token', response.data.accessToken)
        navigate('/home')
      } else {
        toast.error(response.data.message)
      }
    } catch (err) {
      console.error(' Login Error:', err)
      toast.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-header">
            <div className="brand">LinguaLink</div>
            <h2 className="auth-title">Welcome Back!</h2>
            <p className="auth-subtitle">Sign in to your account</p>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='Enter your email'
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Enter your password'
              required
              className="form-input"
            />
          </div>

          <button type='submit' className="auth-button">
            Log In
          </button>

          <div className="auth-footer">
            <p>
              Don't have an account?
              <Link to='/register' className="auth-link">Sign Up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login