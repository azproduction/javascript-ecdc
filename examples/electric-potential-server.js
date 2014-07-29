/**
 *
 */

var express = require('express'),
    util = require('util'),
    EcdcServer = require('..').EcdcServer;

var ElectricPotentialServer = function () {
    EcdcServer.call(this);
};

util.inherits(ElectricPotentialServer, EcdcServer);

var server = new ElectricPotentialServer();

// Serve statics
server.httpServer.use(express.static(__dirname + '/electric-potential-server'));
server.httpServer.use(express.static(__dirname + '/../lib/ecdc'));

server.httpServer.listen(8080);

console.log('Electric Potential JavaScript ECDC server is listening 0.0.0.0:8080');
console.log('Browse http://127.0.0.1:8080/index.html\n');

// Print status to console
process.stdout.write('\r' + new Date() +  ' Sent ' + server.sendTasks + ', Rec. ' + server.receivedTasks);
setInterval(function () {
    process.stdout.write('\r' + new Date() +  ' Sent ' + server.sendTasks + ', Rec. ' + server.receivedTasks);
}, 1000);
