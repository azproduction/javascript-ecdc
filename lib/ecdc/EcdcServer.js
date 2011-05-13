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

    this._setupRoutes(this.httpServer);
};

/**
 * Setup routes
 */
EcdcServer.prototype._setupRoutes = function (httpServer) {
    // Login
    httpServer.get('/login/', this.getLoginAction.bind(this));

    // Get task
    httpServer.get('/task/', this.getTaskAction.bind(this));

    // Save task
    httpServer.post('/task/', this.postTaskAction.bind(this));

    // Statistic
    httpServer.get('/stat.:format?', this.getStatAction.bind(this));
};

/**
 * Action for GET /login/
 *
 * @param {Request} req
 * @param {Response} res
 */
EcdcServer.prototype.getLoginAction = function (req, res) {
    this.createUserId(req, function (err, userId) {
        if (err !== null) {
            res.send(err + '', 403);
            return;
        }

        // expires: plus 10 years
        res.cookie('ecdcuid', userId, {expires: new Date(+new Date() + 315360000000), path: '/'});
        res.send('', 200);
    });
};

/**
 * Action for GET /task/
 *
 * @param {Request} req
 * @param {Response} res
 */
EcdcServer.prototype.getTaskAction = function (req, res) {
    var self = this;

    if (req.xhr && this.isOwnUser(req)) {
        this.createTasks(req, function (status, tasks) {
            if (status === self.STATE_COMPLETE || status === self.STATE_MAX_REACHED) {
                tasks = [];
            } else if (status !== null) {
                res.send(status + '', 500);
                return;
            }
            if (tasks) {
                self.sendTasks += (tasks.length || 0);
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

/**
 * Action for POST /task/
 *
 * @param {Request} req
 * @param {Response} res
 */
EcdcServer.prototype.postTaskAction = function (req, res) {
    var self = this;
    if (req.xhr && this.isOwnUser(req)) {

        if (req.body) {
            this.receivedTasks += (req.body.length || 0);
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

/**
 * Action for GET /stat.%format%
 *
 * @param {Request} req
 * @param {Response} res
 */
EcdcServer.prototype.getStatAction = function (req, res) {
    if (!this.isOwnUser(req)) {
        // Forbidden
        res.send(403);
        return;
    }

    var format = req.params.format || 'html';

    this.getStatistics(req, function(err, data) {
        if (err) {
            res.send(500);
            return;
        }
        switch (format) {
            case 'json':
                res.send(JSON.stringify(data), {'Content-Type': 'application/json'});
                break;
            default:
                res.send('Send: ' + data.send + ', Received: ' + data.received, {'Content-Type': 'text/html'});
        }
    });
};

/**
 * Creates tasks depend on request
 *
 * @param {Request} request
 * @param {Function} callback function(err, [{id, data, expires}])
 */
EcdcServer.prototype.createTasks = function (request, callback) {
    callback(null, [{
        id: Math.round(Math.random() * 1e16),
        data: Math.random(),
        expires: (new Date(+new Date() + 3 * 60 * 60 * 1000)).toString() // 3h
    }]);
};

/**
 * Send and received tasks statistics
 *
 * @param {Request} request
 * @returns {Object}
 */
EcdcServer.prototype.getStatistics = function (request, callback) {
    callback(null, {
        send: this.sendTasks,
        received: this.receivedTasks
    });
};

/**
 * Creates user id from request data
 *
 * @param {Request} request
 * @param {Function} callback function(err, userId)
 */
EcdcServer.prototype.createUserId = function (request, callback) {
    callback(null, Math.round(Math.random() * 1e16));
};

/**
 * Saves task
 *
 * @param {Request} request
 * @param {Function} callback
 */
EcdcServer.prototype.saveTasks = function (request, callback) {
    callback(null, true);
};

/**
 * Checks current user
 *
 * @param {Request} request
 */
EcdcServer.prototype.isOwnUser = function (request) {
    return true;
};

/**
 * State job done
 *
 * @const
 * @type Number
 */
EcdcServer.prototype.STATE_COMPLETE = 1024;

/**
 * Limit of tasks reached
 *
 * @const
 * @type Number
 */
EcdcServer.prototype.STATE_MAX_REACHED = 1025;

exports.EcdcServer = EcdcServer;