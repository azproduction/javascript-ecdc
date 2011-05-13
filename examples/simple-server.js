/**
 * @fileOverview Simple server
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */
var util = require('util'),
    fs = require('fs'),
    EcdcServer = require('../lib/ecdc/EcdcServer').EcdcServer;

// ----------------------------------------------------------------------------
// Override SimpleServer
// ----------------------------------------------------------------------------
var SimpleServer = function () {
    EcdcServer.call(this);
};

util.inherits(SimpleServer, EcdcServer);

// Overrride isOwnUser
SimpleServer.prototype.isOwnUser = function (request) {
    return !!request.cookies.ecdcuid;
};

// Create ECDC server
var server = new SimpleServer();

// ----------------------------------------------------------------------------
// Cache static files in Node.js Buffer
// ----------------------------------------------------------------------------

var static = {
    'EcdcClient.js':    fs.readFileSync('../lib/ecdc/EcdcClient.js'),
    'EcdcWorker.js':    fs.readFileSync('../lib/ecdc/EcdcWorker.js'),
    'SquareRooter.js':  fs.readFileSync('./simple-server/SquareRooter.js'),
    'main.js':          fs.readFileSync('./simple-server/main.js'),
    'frame.html':       fs.readFileSync('./simple-server/frame.html'),
    'index.html':       fs.readFileSync('./simple-server/index.html')
};

// ----------------------------------------------------------------------------
// Static routers
// I make it just for example.
// Much better to manage static files with HTTP server
// ----------------------------------------------------------------------------

server.httpServer.get('/EcdcClient.js', function (req, res) {
    res.send(static['EcdcClient.js'], {'Content-Type': 'text/javascript'});
});

server.httpServer.get('/EcdcWorker.js', function (req, res) {
    res.send(static['EcdcWorker.js'], {'Content-Type': 'text/javascript'});
});

server.httpServer.get('/SquareRooter.js', function (req, res) {
    res.send(static['SquareRooter.js'], {'Content-Type': 'text/javascript'});
});

server.httpServer.get('/main.js', function (req, res) {
    res.send(static['main.js'], {'Content-Type': 'text/javascript'});
});

server.httpServer.get('/frame.html', function (req, res) {
    res.send(static['frame.html'], {'Content-Type': 'text/html'});
});

server.httpServer.get('/', function (req, res) {
    res.send(static['index.html'], {'Content-Type': 'text/html'});
});

server.httpServer.get('/index.html', function (req, res) {
    res.send(static['index.html'], {'Content-Type': 'text/html'});
});

// ----------------------------------------------------------------------------
// Start application
// ----------------------------------------------------------------------------

server.httpServer.listen(80);
console.log('Simple JavaScript ECDC server is listen on 0.0.0.0:80');
console.log('Browse http://127.0.0.1/index.html\n');

// ----------------------------------------------------------------------------
// Print status to console
// ----------------------------------------------------------------------------

process.stdout.write('\r' + new Date() +  ' Send ' + server.sendTasks + ', Rec. ' + server.receivedTasks);
setInterval(function () {
    process.stdout.write('\r' + new Date() +  ' Send ' + server.sendTasks + ', Rec. ' + server.receivedTasks);
}, 2000);