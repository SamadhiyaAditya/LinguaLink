import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
// import registerImage from '../assets/Register from Rabbit Assets.webp'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post('https://lingualink-9km6.onrender.com/api/auth/register', {
        username: name,
        email,
        password
      })

      console.log('✅ Register Response:', response.data)

      if (response.data.success) {
        toast.success('Registered successfully! Please login.')
        navigate('/home')
      } else {
        toast.error(response.data.message)
      }
    } catch (err) {
      console.error('❌ Register Error:', err)
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className='flex'>
      <div className='w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-12'>
        <form onSubmit={handleSubmit} className='w-full max-w-md bg-white p-8 rounded-lg border shadow-sm'>
          <div className='flex justify-center mb-6'>
            <h2 className='text-xl font-medium'>Rabbit</h2>
          </div>
          <h2 className='text-2xl font-bold text-center mb-6'>Create your account</h2>

          <div className='mb-4'>
            <label className='block text-sm font-semibold mb-2'>Name</label>
            <input 
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full p-2 border rounded'
              placeholder='Enter your name'
              required
            />
          </div>

          <div className='mb-4'>
            <label className='block text-sm font-semibold mb-2'>Email</label>
            <input 
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full p-2 border rounded'
              placeholder='Enter your email'
              required
            />
          </div>

          <div className='mb-4'>
            <label className='block text-sm font-semibold mb-2'>Password</label>
            <input 
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full p-2 border rounded'
              placeholder='Enter your password'
              required
            />
          </div>

          <button 
            type='submit'
            className='w-full bg-black text-white p-2 rounded-lg font-semibold hover:bg-gray-800 transition'
          >
            Sign Up
          </button>

          <p className='mt-6 text-center text-sm'>
            Already have an account?{' '}
            <Link to='/login' className='text-blue-500'>Login</Link>
          </p>
        </form>
      </div>

      {/* <div className='hidden md:block w-1/2 bg-gray-800'>
        <img src={registerImage} alt='Register' className='h-[750px] w-full object-cover' />
      </div> */}
    </div>
  )
}

export default Register