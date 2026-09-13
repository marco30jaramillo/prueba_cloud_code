require('colors');
const { exit } = require('process');
const {Server, Usuario} = require('../models');
const bcryptjs = require('bcryptjs');




const cabeceraConfiguracion = () => {
    console.clear();
    console.log(`================================================`.green);
    console.log(`           Configuracion inicial                `.green)
    console.log(`================================================`.green);

}

const pausa = () =>{
    return new Promise(resolve =>{
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
    
        readline.question(`\nPresione: ${'ENTER'.green}, para continuar \n`, (opt)=>{
            readline.close();
            resolve(opt);
        })
    })
};

const configuracionInicial = async() =>{
    cabeceraConfiguracion();

    const server = new Server();
    
    const usuarioRootExiste = await Usuario.findOne({rol:"ROOT"});

    if(usuarioRootExiste){
        console.log(`el usuario root ya esta registrado en la BD, se enviara un correo de recuperación del usuario al correo registrado`);
        await pausa();
        exit();
    }else{
        const readLine = require('readline').createInterface({
            input:process.stdin,
            output:process.stdout
        });
        readLine.question('Ingrese el nombre del usuario [root]: ',(nombre)=>{
            if(nombre == "" ){
                nombre="root"
            }
            readLine.question('Ingrese un correo : ',(correo)=>{
                
                readLine.question('Ingrese la contraseña [root_admin]: ',async (password)=>{
                    if(password == "" ){
                         password="root_admin"
                    }

                    const usuario=new Usuario({
                        nombre,
                        tipoIdentificacion:'CC',
                        identificacion:'000000000',
                        direccion:'---------------',
                        numCelular:'---------------',
                        correoPrincipal: correo,
                        rol:"ROOT"
                    });
                    const salt = bcryptjs.genSaltSync();
                    usuario.password = bcryptjs.hashSync(password, salt);
                    
                    await usuario.save();
    
                    console.log(`El usuario fue creado con exito.`);
                    await pausa();

                    console.clear();
                    server.listen();

                })    
            })
        })
    }  
}

module.exports={
    configuracionInicial
}
