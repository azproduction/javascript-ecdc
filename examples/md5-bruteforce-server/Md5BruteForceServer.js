/**
 *
 */

var util = require('util'),
    EcdcServer = require('../../lib/ecdc/EcdcServer').EcdcServer,
    StaticController = require('./controllers/StaticController').StaticController,
    md5 = require('./md5').md5,
    nc = require('./NumberConverter'),
    sqlite3 = require('sqlite');

var PASSWORD = "P.w~Pew0",
    PASSWORD_MD5_HASH = md5(PASSWORD),
    EXPIRES = 3 * 60 * 60 * 1000, // plus 3h
    PASSWORD_MAX_SYMBOLS = PASSWORD.length,
    PASSWORD_ALPHABET = 96,
    MAX_PASSWORDS_COUNT = Math.pow(PASSWORD_ALPHABET, PASSWORD_MAX_SYMBOLS),
    TASK_STEP = 400000, // passwords per task
    TASKS_COUNT = Math.ceil(MAX_PASSWORDS_COUNT / TASK_STEP),

    SQLITE3_PATH = __dirname + '/database/ecdc.sqlite3',
    SQLITE3_TABLE = "CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, expires INTEGER, done SMALLINT)"
    ;

var complete = false,
    maxReached = false;

var Md5BruteForceServer = function (callback) {
    EcdcServer.call(this);
    StaticController.init(this.httpServer);
    this._prepareDatabase(SQLITE3_PATH, callback);
};

util.inherits(Md5BruteForceServer, EcdcServer);

Md5BruteForceServer.prototype.createTasks = function (request, callback) {
    var now = +new Date(),
        self = this;

    if (complete) {
        callback('complete');
        return;
    }
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
                callback('max reached');
                return;
            }
            // Create
            self.db.execute('INSERT INTO tasks VALUES (NULL, ?, 0)', [expires], function (err) {
                // get last insert id
                self.db.execute("SELECT last_insert_rowid() AS id", function (err, rows) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var row = rows[0];
                    // Send
                    if (row.id > TASKS_COUNT) {
                        callback('max reached');
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
        var row = rows[rows.length * Math.random()];

        // Update db: set new expires
        self.db.execute('UPDATE tasks SET expires = ? WHERE id = ?', [expires, row.id], function (err) {
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
    for (var i = 0, c = tasks.length; i < c; i++) {
        if (tasks[i].data) {
            console.log("Found: " + tasks[i].data);
            // Don't send any
            complete = true;
            callback('complete');
        }
        this.db.execute("UPDATE tasks SET done = 1 WHERE id = ?", [tasks[i].id], function(){});
    }

    if (!complete) {
        callback(null, true);
    }
};

Md5BruteForceServer.prototype.isOwnUser = function (request) {
    // Just check cookie
    return !!request.cookies.uid;
};

Md5BruteForceServer.prototype._prepareDatabase = function (path, callback) {
    var db = new sqlite3.Database();
    db.open(path, function () {
        db.execute(SQLITE3_TABLE, callback);
    });

    this.db = db;
};

exports.Md5BruteForceServer = Md5BruteForceServer;