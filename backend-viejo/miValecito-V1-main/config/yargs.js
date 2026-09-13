
const {argv} = require('yargs')
.option('c',{
    alias:'configuration',
    type:'boolean',
    describe:"Permite realizar la configuracion inicial",
    default:false
})
.option('s',{
    alias:'start',
    type:'boolean',
    describe:"Iniciar servicio",
    default:false
})
.check((argv,options)=>{
    
    if(isNaN(argv.s)  || isNaN(argv.c)){
        throw 'Un parametro no tiene el formato adecuado\n';
    }
    return true;

});


module.exports = argv;

