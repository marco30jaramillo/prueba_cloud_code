
const auth = require('./auth');
// const buscar = require('./z_buscar');
// const categorias = require('./z_categorias');
// const productos = require('./z_productos');
const pagos = require('./pagos');
const usuarios = require('./usuarios');
const cuentas = require('./cuentas');


module.exports={
    ...auth,
    ...pagos,
    // ...buscar,
    // ...categorias,
    // ...productos,
    // ...uploads,
    ...usuarios,
    ...cuentas
}