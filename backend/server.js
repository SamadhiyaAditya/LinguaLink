require('dotenv').config()
const cors = require('cors')

const connectTODB = require('./db/db')
const express = require('express');
const { Db } = require('mongodb');


const authRoutes = require('./routes/auth-routes')

const app = express()
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "https://lingua-link-kappa.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json())

connectTODB()

app.use('/api/auth',authRoutes)

app.listen(PORT,()=>{
    console.log("server is listening");
})