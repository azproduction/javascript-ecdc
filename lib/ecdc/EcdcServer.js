/**
 * JavaScript ECDC Server Class
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

    this.httpServer = express();

    this.httpServer.use(require('errorhandler')({ dumpExceptions: true, showStack: true }));
    // Required for auth
    this.httpServer.use(require('cookie-parser')());
    // Required for parse POST JSON
    this.httpServer.use(require('body-parser').json());
    this.httpServer.use(require('body-parser').urlencoded({ extended: false }));

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
            res.status(403).send(err + '');
            return;
        }

        // expires: plus 10 years
        res.cookie('ecdcuid', userId, {expires: new Date(+new Date() + 315360000000), path: '/'});
        res.status(200).send('');
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
                res.status(500).send(status + '');
                return;
            }
            if (tasks) {
                self.sendTasks += (tasks.length || 0);
            } else {
                self.sendTasks += 1;
            }

            res.json(tasks);
        });
    } else {
        // Forbidden
        res.status(403).end();
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
        res.status(403).end();
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
        res.status(403).end();
        return;
    }

    var format = req.params.format || 'html';

    this.getStatistics(req, function(err, data) {
        if (err) {
            res.status(500).end();
            return;
        }
        switch (format) {
            case 'json':
                res.json(data);
                break;
            default:
                res.type('html').send('Sent: ' + data.send + ', Received: ' + data.received);
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
