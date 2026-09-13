require('dotenv').config();
const {Server} = require('./models');
const argv = require('./config/yargs');
const { configuracionInicial } = require('./helpers/mensajes');

console.clear();

const iniciarServer = async()=>{
    const server = new Server();
    server.listen();
}

const main = async()=>{
    if(argv.s){
        iniciarServer();
    }
    if(argv.c){
        await configuracionInicial();
    }else{  
    }
}

main();

