/**
 *
 */
var express = require('express');
var Md5BruteForceServer = require('./md5-bruteforce-server/Md5BruteForceServer').Md5BruteForceServer;

var server = new Md5BruteForceServer(function (err) {
    if (err) {
        console.log('Error ' + err);
        return;
    }
    server.httpServer.listen(8080);

    // Serve statics
    server.httpServer.use(express.static(__dirname + '/md5-bruteforce-server'));
    server.httpServer.use(express.static(__dirname + '/../lib/ecdc'));

    console.log('Md5 JavaScript ECDC server is listening 0.0.0.0:8080');
    console.log('Browse http://127.0.0.1:8080/index.html\n');

    // Print status to console
    process.stdout.write('\r' + new Date() +  ' Sent ' + server.sendTasks + ', Rec. ' + server.receivedTasks);
    setInterval(function () {
        process.stdout.write('\r' + new Date() +  ' Sent ' + server.sendTasks + ', Rec. ' + server.receivedTasks);
    }, 1000);
});
