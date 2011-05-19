/**
 * @fileOverview md5 server
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */

var util = require('util'),
    fs = require('fs'),
    EcdcServer = require('../../lib/ecdc/EcdcServer').EcdcServer,
    StaticController = require('./controllers/StaticController').StaticController,
    md5 = require('./md5').md5,
    nc = require('./NumberConverter'),
    sqlite3 = require('sqlite');

var PASSWORD = "P.w~Pew0", // Hardcoded password md5 and its options
    PASSWORD_MD5_HASH = md5(PASSWORD),
    EXPIRES = 3 * 60 * 60 * 1000, // plus 3h
    PASSWORD_MAX_SYMBOLS = PASSWORD.length,
    PASSWORD_ALPHABET = 96,
    MAX_PASSWORDS_COUNT = Math.pow(PASSWORD_ALPHABET, PASSWORD_MAX_SYMBOLS),
    TASK_STEP = 400000, // passwords per task
    TASKS_COUNT = Math.ceil(MAX_PASSWORDS_COUNT / TASK_STEP),

    // Database config
    RESULT_FILE_PATH = __dirname + '/database/result.txt',
    SQLITE3_PATH = __dirname + '/database/ecdc.sqlite3',
    SQLITE3_TABLE = "CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, expires INTEGER, done SMALLINT, user CHARACTER(32))"
    ;

var complete = false,
    maxReached = false;

try { // If file not exists
    complete = !!fs.readFileSync(RESULT_FILE_PATH, 'utf8') || false;
} catch (e) {
    complete = false;
}

var Md5BruteForceServer = function (callback) {
    EcdcServer.call(this);
    StaticController.init(this.httpServer);
    this.httpServer.set('view engine', 'ejs');
    this.httpServer.set('view options', {
        layout: false
    });
    this._prepareDatabase(SQLITE3_PATH, callback);
};

util.inherits(Md5BruteForceServer, EcdcServer);

/**
 * Setup routes
 */
EcdcServer.prototype._setupRoutes = function (httpServer) {
    // Login
    httpServer.post('/login/', this.postLoginAction.bind(this));

    // Logout
    httpServer.get('/logout/', this.getLogoutAction.bind(this));

    // Get task
    httpServer.get('/task/', this.getTaskAction.bind(this));

    // Save task
    httpServer.post('/task/', this.postTaskAction.bind(this));

    // Statistic
    httpServer.get('/stat.:format?', this.getStatAction.bind(this));
};

/**
 * Action for POST /login/
 *
 * @param {Request} req
 * @param {Response} res
 */
EcdcServer.prototype.postLoginAction = function (req, res) {
    this.createUserId(req, function (err, userId) {
        if (err !== null) {
            res.send(err + '', 403);
            return;
        }

        // expires: plus 10 years
        res.cookie('ecdcuid', userId, {expires: new Date(+new Date() + 315360000000), path: '/'});
        res.redirect('/frame.html');
    });
};

EcdcServer.prototype.getLogoutAction = function (req, res) {
    res.cookie('ecdcuid', '', {expires: new Date(0), path: '/'});
    res.redirect('/index.html');
};

Md5BruteForceServer.prototype.createTasks = function (request, callback) {
    var now = +new Date(),
        self = this;

    if (complete) {
        callback(self.STATE_COMPLETE);
        return;
    }

    var user = request.cookies.ecdcuid;
    // Check if some undone task is expires
    this.db.execute('SELECT id FROM tasks WHERE expires > ? AND done = 0', [now], function(err, rows) {
        if (err) {
            callback(err);
            return;
        }

        var expires = +new Date() + EXPIRES;
        // Not expires found - create, send
        if (!rows.length) {
            if (maxReached) {
                callback(self.STATE_MAX_REACHED);
                return;
            }
            // Create
            self.db.execute('INSERT INTO tasks VALUES (NULL, ?, 0, ?)', [expires, user], function (err) {
                // get last insert id
                self.db.execute("SELECT last_insert_rowid() AS id", function (err, rows) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var row = rows[0];
                    // Send
                    if (row.id > TASKS_COUNT) {
                        callback(self.STATE_MAX_REACHED);
                        maxReached = true;
                        return;
                    }
                    callback(null, [{
                        id: row.id,
                        data: {
                            min: (row.id - 1) * TASK_STEP,
                            max: row.id * TASK_STEP,
                            base: PASSWORD_ALPHABET,
                            hash: PASSWORD_MD5_HASH
                        },
                        expires: (new Date(expires)).toString()
                    }]);
                });
            });
            return;
        }

        // Found expires
        // Get random one
        var rowId = Math.floor(rows.length * Math.random());
        var row = rows[rowId];

        // Update db: set new expires and user
        self.db.execute('UPDATE tasks SET expires = ?, user = ? WHERE id = ?', [expires, user, row.id], function (err) {
            if (err) {
                callback(err);
                return;
            }
            // Send
            callback(null, [{
                id: row.id,
                data: {
                    min: (row.id - 1) * TASK_STEP,
                    max: row.id * TASK_STEP,
                    base: PASSWORD_ALPHABET,
                    hash: PASSWORD_MD5_HASH
                },
                expires: (new Date(expires)).toString()
            }]);
        });
    });
};

Md5BruteForceServer.prototype.createUserId = function (request, callback) {
    var name = request.param('name', false);
    callback(name ? null : 'Name undefined', name ? md5(name) : '');
};

Md5BruteForceServer.prototype.saveTasks = function (request, callback) {
    var tasks = request.body || [];

    // Set flag done to all income tasks
    var user = request.cookies.ecdcuid;
    for (var i = 0, c = tasks.length; i < c; i++) {
        if (tasks[i].data && PASSWORD_MD5_HASH === md5(tasks[i].data)) {
            console.log("Found: " + tasks[i].data);
            // Don't send any
            complete = true;
            fs.writeFileSync(RESULT_FILE_PATH, tasks[i].data, 'utf8');
            callback(this.STATE_COMPLETE);
        }
        this.db.execute('UPDATE tasks SET done = 1, user = ? WHERE id = ?', [user, tasks[i].id], function(){});
    }

    if (!complete) {
        callback(null, true);
    }
};

Md5BruteForceServer.prototype.getStatAction = function (req, res) {
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
                data.ecdcuid = req.cookies.ecdcuid;
                res.render(__dirname + '/view/stat.ejs', data);
        }
    });
};

Md5BruteForceServer.prototype.getStatistics = function (request, callback) {
    var self = this,
        user = request.cookies.ecdcuid;

    this.db.execute('SELECT COUNT(*) AS count FROM tasks WHERE user = ? AND done = 1', [user], function (err, rows) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, {
            send: self.sendTasks,
            received: self.receivedTasks,
            my: rows[0].count,
            complete: complete,
            max_tasks: TASKS_COUNT,
            calculated: self.receivedTasks * TASK_STEP,
            my_percent: (rows[0].count * 100 / self.receivedTasks).toFixed(2)
        });
    });
};

Md5BruteForceServer.prototype.isOwnUser = function (request) {
    // Just check cookie
    return !!(request.cookies.ecdcuid + '').match(/^[0-9a-f]{32}$/);
};

Md5BruteForceServer.prototype._prepareDatabase = function (path, callback) {
    var self = this;

    var db = new sqlite3.Database();
    db.open(path, function () {
        db.execute(SQLITE3_TABLE, function (err) {
            if (err) {
                callback(err);
                return;
            }
            db.execute('SELECT COUNT(*) AS count FROM tasks', function (err, rows) {
                if (err) {
                    callback(err);
                    return;
                }
                self.sendTasks = rows[0].count;
                db.execute('SELECT COUNT(*) AS count FROM tasks WHERE done = 1', function (err, rows) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    self.receivedTasks = rows[0].count;
                    callback();
                });
            });
        });
    });

    this.db = db;
};

exports.Md5BruteForceServer = Md5BruteForceServer;