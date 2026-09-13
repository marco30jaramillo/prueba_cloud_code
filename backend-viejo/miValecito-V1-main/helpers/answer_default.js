
function defaultMethod( router){
    router.get("*",defaultpage404);
    router.post("*",defaultpage404);
    router.put("*",defaultpage404);
    router.delete("*",defaultpage404);
    router.patch("*",defaultpage404);
    router.copy("*",defaultpage404);
    router.head("*",defaultpage404);
    router.options("*",defaultpage404);
    router.link("*",defaultpage404);
    router.unlink("*",defaultpage404);
    router.purge("*",defaultpage404);
    router.lock("*",defaultpage404);
    router.unlock("*",defaultpage404);
    router.propfind("*",defaultpage404);

}


const defaultpage404 = (req, res) => {
    return res.status(404).json({
        msg:"No se ha encontrado un Rest Point asociado."
    })
}


module.exports = {
    defaultMethod
}