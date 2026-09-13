const { response } = require('express');
const mongoose=require('mongoose');

const dbConnection = async(res =response)=>{
    try{
        await mongoose.connect(process.env.MONGODB_CNN);
        
        
        console.log('DATABASE ONLINE');
    }catch(err){
        console.log(err);
        throw new Error('Error a la hora de iniciar la base de datos');
    }
}


module.exports={
    dbConnection
}