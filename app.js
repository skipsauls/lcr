var express = require('express');
var https = require('https');
var http = require('http');
var request = require('request');
var url = require('url');
//var oauth = require('./oauth.js');
//var rest = require('./rest.js');
var rest = require('restler');
var fs = require('fs');
var os = require('os');
var argv = require('minimist')(process.argv.slice(2));
var env = require('node-env-file');
var debug = argv.d || argv.debug || process.env.DEBUG || false;
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var Datauri = require('datauri');

try {
    env(__dirname + '/.env');
} catch (e) {
    console.error('Exception: ', e);
}
var app = express();

var port = process.env.PORT || 3000;
var https_port = process.env.HTTPS_PORT || parseInt(port) + 1;


console.log('platform: ', os.platform());
console.log('arch: ', os.arch());
console.log('hostname: ', os.hostname());


//app.set('view engine', 'jade');
app.set('view engine', 'ejs');

app.set('views', './views');

app.use(express.static(__dirname + '/public'));

var jsonParser = bodyParser.json();

app.use(cookieParser('games4jeff'));


app.use(bodyParser.urlencoded({ extended: false }));

app.use(jsonParser);


// Create an HTTP service
var server = http.createServer(app).listen(port);
console.log("Server listening for HTTP connections on port ", port);

// Create an HTTPS service if the certs are present
var secureServer = null;
try {
    var options = {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('key-cert.pem')
    };
    secureServer = https.createServer(options, app).listen(https_port);    
    console.log("Server listening for HTTPS connections on port ", https_port);
    server = secureServer;

} catch (e) {
    console.error("Security certs not found, HTTPS not available");
}

/* Game modules */
var game = require('./game/base.js');

game.init(app, server);

/*
console.warn('11111111111111111');

var rochambeau = require('./games/rochambeau.js');

rochambeau.init(app, server);

console.warn('22222222222222222');

*/
