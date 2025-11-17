import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import UserLayout from './/Layout/UserLayout'
import Home from './home'
import { Toaster } from 'sonner'
import Login from './login'
import Register from './register'

function App() {
  return (
    <BrowserRouter>
      <Toaster position='top-right' />

      <Routes>
        <Route path='/' element={<Register />} />
        <Route path='/home' element={<Home />} />
        <Route path='login' element={<Login />} />
        <Route path='register' element={<Register />} />
      </Routes>


    </BrowserRouter>
  )
}

export default App