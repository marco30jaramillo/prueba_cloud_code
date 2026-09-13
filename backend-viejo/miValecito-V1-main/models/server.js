const express = require("express");
const cors = require('cors');
const { dbConnection } = require("../config/databaseConfig.js");
const { response } = require("express");
const { defaultMethod } = require("../helpers/answer_default.js");
//const fileUpload = require('express-fileupload');

class Server{

    constructor(){
        this.app=express();
        this.port=process.env.PORT;
        this.paths= {
            auth: '/api/auth',
            usuarios: '/api/usuarios',
            cuentas:'/api/cuentas',
            pagos:'/api/pagos',
            default:'*'        
        }

        //Conectar Databbase
        this.conectarDB();

        //Middleware
        this.middlewares();

        //rutas de mi aplicacion
        this.routes();

        this.default();
    }
    


    async conectarDB(){
        await dbConnection();
    }
    middlewares(){
        //CORS
        this.app.use(cors());

        //Lectura y parseo del bbody
        this.app.use(express.json());

        //directorio publico
        this.app.use(express.static('public'));

        //FuleUpload - Cargar archivos
        /*this.app.use(fileUpload({
            useTempFiles : true,
            tempFileDir : '/tmp/',
            createParentPath:true
        }));*/
    }
    default(){
            defaultMethod(this.app);
    }
    

    routes(){

        this.app.use(this.paths.auth, require('../routes/auth'));
        this.app.use(this.paths.usuarios, require('../routes/usuarios'));
        this.app.use(this.paths.cuentas, require('../routes/cuentas'));
        this.app.use(this.paths.pagos, require('../routes/pagos'));

    }

    listen(){
        this.app.listen(this.port, ()=>{
            console.log(`Server corriendo en http://localhost:${this.port}`);
        })
    }
}

module.exports=Server;