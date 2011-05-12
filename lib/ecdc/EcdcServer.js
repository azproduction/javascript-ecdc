/**
 * @fileOverview JavaScript ECDC Server Class
 *
 * @author  azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 * @version 0.1a
 */

var express = require('express');

/**
 * JavaScript ECDC Server
 *
 * @constructor
 */
var EcdcServer = function () {
    this.sendTasks = 0;
    this.receivedTasks = 0;

    this.httpServer = express.createServer();

    this.httpServer.configure(function () {
        this.use(express.errorHandler({dumpExceptions: true, showStack: true}));
        // Required for auth
        this.use(express.cookieParser());
        // Required for parse POST JSON
        this.use(express.bodyParser());
    });

    // Login
    this.httpServer.get('/login/', this.getLoginAction.bind(this));

    // Get task
    this.httpServer.get('/task/', this.getTaskAction.bind(this));

    // Save task
    this.httpServer.post('/task/', this.postTaskAction.bind(this));

    // Statistic
    this.httpServer.get('/stat.:format?', this.getStatAction.bind(this));
};

EcdcServer.prototype.getLoginAction = function (req, res) {
    // expires: plus 10 years
    this.createUserId(req, function (err, userId) {
        if (err !== null) {
            res.send(err + '', 403);
            return;
        }
        res.cookie('uid', userId, {expires: new Date(+new Date() + 315360000000), path: '/'});
        res.send('', 200);
    });
};

EcdcServer.prototype.getTaskAction = function (req, res) {
    var self = this;

    if (req.xhr && this.isOwnUser(req)) {
        this.createTasks(req, function (err, tasks) {
            if (err !== null) {
                res.send(err + '', 500);
                return;
            }
            if (tasks && tasks.length) {
                self.sendTasks += tasks.length;
            } else {
                self.sendTasks += 1;
            }

            res.send(JSON.stringify(tasks), {'Content-Type': 'application/json'});
        });
    } else {
        // Forbidden
        res.send(403);
    }
};

EcdcServer.prototype.postTaskAction = function (req, res) {
    var self = this;
    if (req.xhr && this.isOwnUser(req)) {

        if (req.body && req.body.length) {
            this.receivedTasks += req.body.length;
        } else {
            this.receivedTasks += 1;
        }

        this.saveTasks(req, function () {
            self.getTaskAction(req, res);
        });
    } else {
        // Forbidden
        res.send(403);
    }
};

EcdcServer.prototype.getStatAction = function (req, res) {
    if (!this.isOwnUser(req)) {
        // Forbidden
        res.send(403);
        return;
    }

    var format = req.params.format || 'html',
        data = this.getStatistics();

    switch (format) {
        case 'json':
            res.send(JSON.stringify(data), {'Content-Type': 'application/json'});
            break;
        default:
            res.send('Send: ' + data.send + ', Received: ' + data.received, {'Content-Type': 'text/html'});
    }
};

EcdcServer.prototype.createTasks = function (request, callback) {
    callback(null, [{
        id: Math.round(Math.random() * 1e16),
        data: Math.random(),
        expires: (new Date(+new Date() + 3 * 60 * 60 * 1000)).toString() // 3h
    }]);
};

EcdcServer.prototype.getStatistics = function (request) {
    return {
        send: this.sendTasks,
        received: this.receivedTasks
    };
};

EcdcServer.prototype.createUserId = function (request, callback) {
    callback(null, Math.round(Math.random() * 1e16));
};

EcdcServer.prototype.saveTasks = function (request, callback) {
    callback(null, true);
};

EcdcServer.prototype.isOwnUser = function (request) {
    return true;
};

exports.EcdcServer = EcdcServer;