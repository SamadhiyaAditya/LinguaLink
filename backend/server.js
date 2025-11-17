require('dotenv').config()
const cors = require('cors')

const connectTODB = require('./db/db')
const express = require('express');
const { Db } = require('mongodb');


const authRoutes = require('./routes/auth-routes')
// const homeRoutes = require('./routes/home-routes')
// const adminRoutes = require('./routes/admin-routes')
// const uploadImageRoutes = require('./routes/image-routes')



const app = express()
const PORT = process.env.PORT || 3000;


// app.use(
//   cors({
//     origin: ['http://localhost:5175', 'http://127.0.0.1:5175'],
//     credentials: true,
//   })
// );

// app.use(cors());

// OR, for stricter control:
app.use(
  cors({
    origin: "https://lingua-link-kappa.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);


// Middlewares
app.use(express.json())

// app.use(
//   cors({
//     origin: 'http://localhost:5175', // your React app URL (Vite default)
//     credentials: true, // allow sending cookies or tokens if needed
//   })
// );



// connected our database
connectTODB()

// 
app.use('/api/auth',authRoutes)
// app.use('/api/home',homeRoutes)
// app.use('/api/admin',adminRoutes)
// app.use('/api/image',uploadImageRoutes)

app.listen(PORT,()=>{
    console.log("server is listening");
})