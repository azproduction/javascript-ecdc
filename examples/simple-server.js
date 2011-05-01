/**
 * @fileOverview Simple server
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */
var express = require('express'),
    util = require('util'),
    fs = require('fs'),
    EcdcServer = require('../lib/ecdc/EcdcServer').EcdcServer;

// ----------------------------------------------------------------------------
// Override SimpleServer
// ----------------------------------------------------------------------------
var SimpleServer = function () {
    this.send = 0;
    this.received = 0;
};

util.inherits(SimpleServer, EcdcServer);

// Overrride saveTasks
SimpleServer.prototype.saveTasks = function (request) {
    // Do nothing
    this.received += request.body.length;
    /* // Uncoment for logs
    for (var i = 0, c = request.body.length; i < c; i++) {
        console.log(request.body[i].id + ': ' + request.body[i].data);
    }
    */
    return true;
};

// Overrride createTasks
SimpleServer.prototype.createTasks = function (request) {
    this.send++;
    return {
        id: Math.round(Math.random() * 1e16),
        data: Math.random(),
        expires: (new Date(+new Date() + 3 * 60 * 60 * 1000)).toString() // 3h
    };
};

// Overrride isOwnUser
SimpleServer.prototype.isOwnUser = function (request) {
    return request.cookies.uid;
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
// Create Express server
// ----------------------------------------------------------------------------

var app = express.createServer();

app.configure(function () {
    this.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    // Required for auth
    this.use(express.cookieParser());
    // Required for parse POST JSON
    this.use(express.bodyParser());
});

// ----------------------------------------------------------------------------
// Basic routes
// ----------------------------------------------------------------------------

// Login
app.get('/login/', function (req, res) {
    res.cookie('uid', server.createUserId(req), {httpOnly: true, path: '/'});
    res.send('', 200);
});

// Get task
app.get('/task/', function (req, res) {
    if (req.xhr && server.isOwnUser(req)) {
        res.send(JSON.stringify(server.createTasks(req)), {'Content-Type': 'application/json'});
    } else {
        // Forbidden
        res.send(403);
    }
});

// Save task
app.post('/task/', function (req, res) {
    if (req.xhr && server.isOwnUser(req)) {
        server.saveTasks(req);
        res.send(JSON.stringify(server.createTasks(req)), {'Content-Type': 'application/json'});
    } else {
        // Forbidden
        res.send(403);
    }
});

// ----------------------------------------------------------------------------
// Static routers
// I make it just for example.
// Much better to manage static files with HTTP server
// ----------------------------------------------------------------------------

app.get('/EcdcClient.js', function (req, res) {
    res.send(static['EcdcClient.js'], {'Content-Type': 'text/javascript'});
});

app.get('/EcdcWorker.js', function (req, res) {
    res.send(static['EcdcWorker.js'], {'Content-Type': 'text/javascript'});
});

app.get('/SquareRooter.js', function (req, res) {
    res.send(static['SquareRooter.js'], {'Content-Type': 'text/javascript'});
});

app.get('/main.js', function (req, res) {
    res.send(static['main.js'], {'Content-Type': 'text/javascript'});
});

app.get('/frame.html', function (req, res) {
    res.send(static['frame.html'], {'Content-Type': 'text/html'});
});

app.get('/', function (req, res) {
    res.send(static['index.html'], {'Content-Type': 'text/html'});
});

app.get('/index.html', function (req, res) {
    res.send(static['index.html'], {'Content-Type': 'text/html'});
});

// ----------------------------------------------------------------------------
// Start application
// ----------------------------------------------------------------------------

app.listen(80);
console.log('Simple JavaScript ECDC server is listen on 0.0.0.0:80');
console.log('Browse http://127.0.0.1/index.html\n');

// ----------------------------------------------------------------------------
// Print status to console
// ----------------------------------------------------------------------------

process.stdout.write('\r' + new Date() +  ' Send ' + server.send + ', Rec. ' + server.received);
setInterval(function () {
    process.stdout.write('\r' + new Date() +  ' Send ' + server.send + ', Rec. ' + server.received);
}, 2000);