// Creamos las dependencias
var express = require('express');
var bodyParser = require("body-parser");
var mongoose = require('mongoose');
var items = require("./items.js");
var app = express();

// Variables globales
var almacenItems = new Object;
var respuesta = new Object;

// Configuramos puertos y conexiones
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
app.set('puerto', (process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Conectamos la BD
var uri_mlab = "mongodb://items:items1@ds044587.mlab.com:44587/items";
var uri_localhost = "mongodb://localhost/itemsTest"
var URI_mongo_mlab = uri_mlab || uri_localhost; 
mongoose.connect(URI_mongo_mlab, { useNewUrlParser: true }, function (err, res) {
    if(err) console.log('ERROR conectando a: ' + URI_mongo_mlab + '. ' + err);
    else console.log ('BD conectada a: ' + URI_mongo_mlab);
});

// Creamos y enlazamos el modelo de la BD
var itemsSchema = new mongoose.Schema({
    ID: { type: String },
    nombre: { type: String },
    cantidad: { type: Number },
    precio: { type: Number }
});
var itemsBD = mongoose.model('items', itemsSchema); // Exportar para test

/****************************   APP RUTAS   *****************************/

/*  "/"
 *    GET: Devolver status OK
 */

// Mostramos status OK
app.get('/', function(request, response){
    respuesta = { "status" : "OK" };
    response.status(200).type('json').send(respuesta);
});

/*  "/item/:nombre/:cantidad/:precio"
 *    PUT: Crear nuevo item.
 *    POST: Actualizar item por nombre.
 */
app.put('/item/:nombre/:cantidad/:precio', function(request, response){
    var nuevoItem = new items(request.params.nombre, request.params.cantidad, request.params.precio);

    var nuevoItemBD = new itemsBD({
        ID: 'ID_' + nuevoItem.nombre,
        nombre: nuevoItem.nombre,
        cantidad: nuevoItem.cantidad,
        precio: nuevoItem.precio
    });
    
    // Comprobamos si el item existe
    itemsBD.find({ ID: nuevoItem.ID }, function(err,res) {

        if(err) response.status(500);           // Error BD
        else if(res.length == 0) {      
            // Si no existe, lo creamos
            var resp;
            itemsBD.create(nuevoItemBD, function(err,res){
                if(err) response.status(500);                       // Error BD
                else response.status(200).type('json').send(res);   // Item insertado                  
            });
        } else response.status(200).type('json').send({ txt: 'ITEM ya existe'});  // No insertamos
    });
});

// ACTUALIZARRRRR
app.post('/item/:nombre/:cantidad/:precio', function(request, response){
    var existe = false;    
    
    // Buscamos el item 
    for(var clave in almacenItems) {
        if(almacenItems[clave].nombre == request.params.nombre) {
            // Si existe, actualizamos los valores
            var auxClave = clave;
            existe = true;
            almacenItems[clave].cantidad = request.params.cantidad;
            almacenItems[clave].precio = request.params.precio;
        } 
    }

    // Si existe, lo mostramos modificado, sino, mensaje de error.
    if(existe) respuesta = almacenItems[auxClave];
    else respuesta = "ITEM no existe"; 

    response.status(200).type('json').send(JSON.stringify(respuesta, null, "\t"));
});

/*  "/item"
 *    GET: Mostrar todos los items.
 */
app.get('/item', function(request, response){

   itemsBD.find({}, function(err, res){
        if(err) response.status(500);                                           // Error BD
        else if(res.length == 0) response.status(404).type('json').send();      // No hay items
        else response.status(200).type('json').send(res);                       // Items encontrados
   });          
});

/*  "/item/:ID"
 *    GET: Mostrar item por ID.
 *    DELETE: Borrar item por ID.
 */
app.get('/item/:ID', function(request, response){
    var identificador = request.params.ID;
    
    itemsBD.find({ ID: identificador }, function(err, res){
        if(err) response.status(500);                                       // Error BD
        else if(res.length == 0) response.status(404).type('json').send();  // Item no existe
        else response.status(200).type('json').send(res);                // Item encontrado 
   });      
});

// Borramos según ID
app.delete('/item/:ID', function(request, response){      
    var id = request.params.ID;

    // QUE DEVUELE SI EL ITEM NO EXISTE?
    itemsBD.deleteOne({ ID: id }, function(err, res){
        if(err) response.status(500).send(err);                                        // Error BD
        else response.status(200).type('json').send(res[0]);                // Item borrado 
    });

    // Si no existe item, 404
    /*if(JSON.stringify(almacenItems[id]) == undefined){
        response.status(404).type('json').send();        
    } else {
        // Borramos y mostramos los items
        delete almacenItems[id];
        response.status(200).type('json').send();
    } */
});

// Lanzamos la aplicacion
app.listen(app.get('puerto'), server_ip_address, function() {
    console.log("Items app corriendo en " + server_ip_address + ":" + app.get('puerto'));
});

// Exporta la variable para poder hacer tests
module.exports = app;
