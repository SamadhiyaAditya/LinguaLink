const express = require(`express`)
const mongoose = require('mongoose')
const MONGO_URI = process.env.MONGO_URI

const connectTODB = async () =>{
    try {
        await mongoose.connect(MONGO_URI)
        console.log('database successfullly connected');
        
    } catch {
        console.log('error in connecting dataabase');
        process.exit(1)       

    }
}

module.exports = connectTODB;