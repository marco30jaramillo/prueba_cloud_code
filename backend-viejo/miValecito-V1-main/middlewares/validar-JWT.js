const { response } = require('express');
const jwt = require('jsonwebtoken');
const {Usuario} = require('../models');

const validarJWT=async(req,res=response, next)=>{
    
    const token= req.header('x-token');

    if(!token){
        return res.status(401).json({
            msg: 'No hay token en la peticion'
        })
    }

    try{
        const {uid} = jwt.verify(token, process.env.SECRETTOPRIVATEKEY)
        const usuario= await Usuario.findById(uid);

        if( !usuario ) {
            return res.status(401).json({
                msg: 'Token no válido - usuario no existe DB'
            })
        }

        if(!usuario.estado){
            res.status(401).json({
                msg: 'No se reconoce el estado'
            })
        }
        req.usuario=usuario;
        next();

    }catch(err){
        console.log(err)
        res.status(401).json({
            msg:'El token tiene un problema'
        })
    }
    
};


module.exports={
    validarJWT
}