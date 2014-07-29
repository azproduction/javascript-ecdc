/**
 * Simple server
 */
var util = require('util'),
    fs = require('fs'),
    express = require('express'),
    EcdcServer = require('..').EcdcServer;

// Override SimpleServer
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

// Serve statics
server.httpServer.use(express.static(__dirname + '/simple-server'));
server.httpServer.use(express.static(__dirname + '/../lib/ecdc'));

server.httpServer.listen(8080);
console.log('Simple JavaScript ECDC server is listening 0.0.0.0:8080');
console.log('Browse http://127.0.0.1:8080/index.html\n');

// Print status to console
process.stdout.write('\r' + new Date() +  ' Sent ' + server.sendTasks + ', Rec. ' + server.receivedTasks);
setInterval(function () {
    process.stdout.write('\r' + new Date() +  ' Sent ' + server.sendTasks + ', Rec. ' + server.receivedTasks);
}, 1000);