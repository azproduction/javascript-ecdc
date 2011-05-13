/**
 * @fileOverview JavaScript ECDC Client Class
 *
 * @author  azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 * @version 0.1a
 */
var EcdcClient = (function(window, undefined) {

    /**
     * JavaScript ECDC Client
     *
     * @constructor
     * @param {Object}  [options]
     * @param {String}  [options.script='worker.js'] Workers script
     * @param {Number}  [options.count=1]            Workers count
     * @param {Boolean} [options.autoStart=false]
     */
    var EcdcClient = function (options) {
        options = options || {};
        options.count = this.isActive() ? (options.count || 1) : 0;
        options.script = options.script || 'worker.js';
        options.autoStart = options.autoStart || false;

        /**
         * Regexp to match own localStorage keys
         *
         * @type RegExp
         */
        this.taskRegExp = new RegExp('^task-');

        this.workers = [];
        this.workersMap = [];
        this.clientId = Math.round(1e10 * Math.random());
        this.isLocked = false;

        this._monitorLock();

        var self = this;

        this.cleanupTasks();


        for (var i = 0, c = options.count; i < c; i++) {
            (function (workerId) {
                var worker = new Worker(options.script);
                worker.addEventListener('message', function (event) {
                    self.onWorkerMessage(workerId, event.data);
                }, false);
                worker.addEventListener('error', function (error) {
                    self.onWorkerError(workerId, error);
                }, false);
                self.workers.push(worker);
            }(i));
        }

        if (options.autoStart) {
            this.start();
        }
    };

    /**
     * Checks if client can calculate
     *
     * Function can filtrate some kinds of browsers - mobile, slow ones
     */
    EcdcClient.prototype.isActive = function () {
        return typeof window.Worker !== 'undefined' &&
               typeof window.XMLHttpRequest !== 'undefined' &&
               typeof window.JSON !== 'undefined';
    };

    /**
     * Worker throws error
     *
     * @param {Number} workerId
     * @param {Error}  error
     */
    EcdcClient.prototype.onWorkerError = function (workerId, error) {
        console && console.error('Worker %d throws error %s', workerId, error.message);
    };

    /**
     * Router for workers messages
     *
     * @param {Number} workerId
     * @param {Object} data
     * @param {String} data.message message type actually a "port"
     * @param {Object} [data.data]  some data
     * @param {Number} [data.id]    message queue id for some requests with callbacks
     */
    EcdcClient.prototype.onWorkerMessage = function (workerId, data) {
        data = JSON.parse(data);
        switch (data.message) {
            case 'log':
                console && console.log('W %d: %s', workerId, data.data);
                break;
            case 'cleanupTasks':
                this.cleanupTasks(data.data);
                break;
            case 'updateTask':
                this.updateTask(data.data);
                break;
            case 'getTasks':
                this.getTasks(workerId, data.id);
                break;

            // Events
            case 'unauthorized':
                this.onUnauthorized(workerId);
                break;
            case 'no_tasks':
                this.onNoTasks(workerId);
                break;
        }
    };

    /**
     * Post message to all workers
     *
     * @param {String} message
     */
    EcdcClient.prototype.broadcast = function (message) {
        for (var i = 0, c = this.workers.length; i < c; i++) {
            this.workers[i].postMessage(JSON.stringify({message: message}));
        }
    };

    /**
     * Post start message to all workers
     */
    EcdcClient.prototype.start = function () {
        if (!this.isLocked) {
            this.checkUnsentTasks(0);
            this.broadcast('start');
        }
    };

    /**
     * Post pause message to all workers
     */
    EcdcClient.prototype.pause = function () {
        this.broadcast('pause');
    };

    /**
     * Terminates all workers
     */
    EcdcClient.prototype.terminate = function () {
        for (var i = 0, c = this.workers.length; i < c; i++) {
            this.workers[i].terminate();
        }
    };

    /**
     * @type Storage
     */
    EcdcClient.Storage = window.localStorage;

    /**
     * Checks complete but unsent tasks
     *
     * @param {Number} workerId
     */
    EcdcClient.prototype.checkUnsentTasks = function (workerId) {
        // Iterate...
        for (var i = 0, c = EcdcClient.Storage.length, key, item, tasks = [], empty = true; i < c; i++) {
            key = EcdcClient.Storage.key(i);
            if (this.isMyTaskData(key)) {
                item = window.JSON.parse(EcdcClient.Storage.getItem(key));
                // Task is complete and not expired
                if (item.state === 'complete' && +new Date(item.expires) > +new Date()) {
                    // Prepare task list...
                    tasks.push(item.result);
                    empty = false;
                }
            }
        }

        // Force worker to post tasks
        if (!empty) {
            this.workers[workerId].postMessage(JSON.stringify({
                message: 'unsentTasks',
                data: tasks
            }));
        }
    };

    /**
     * Creates task key
     *
     * @param {Object|String} taskOrTaskId
     *
     * @returns {String}
     */
    EcdcClient.prototype.createTaskKey = function (taskOrTaskId) {
        return 'task-' + (taskOrTaskId.id || taskOrTaskId);
    };

    /**
     * Checks if object under that key is task
     *
     * @param {String} key
     *
     * @returns {Boolean} tru if its task
     */
    EcdcClient.prototype.isMyTaskData = function (key) {
        return this.taskRegExp.test(key);
    };

    /**
     * Checks complete but unsent tasks
     *
     * @param {Number} task
     */
    EcdcClient.prototype.updateTask = function (task) {
        var key = this.createTaskKey(task);
        EcdcClient.Storage.setItem(key, JSON.stringify(task));
    };

    /**
     * Cleanups tasks from localStorage
     *
     * @param {String[]} tasksIds
     */
    EcdcClient.prototype.cleanupTasks = function (tasksIds) {
        var i, c, key, item;
        // Cleanup listed tasks
        if (tasksIds) {
            for (i = 0, c = tasksIds.length; i < c; i++) {
                EcdcClient.Storage.removeItem(this.createTaskKey(tasksIds[i]));
            }
            return;
        }
        // Cleanup expired or bad tasks
        for (i = 0, c = EcdcClient.Storage.length; i < c; i++) {
            key = EcdcClient.Storage.key(i);
            if (this.isMyTaskData(key)) {
                try {
                    item = window.JSON.parse(EcdcClient.Storage.getItem(key));
                } catch (e) {
                    item = undefined;
                }
                // If bad
                if (typeof item !== 'object') {
                    EcdcClient.Storage.removeItem(key);
                    continue;
                }
                // Task is expired, cleanup
                if (+new Date(item.expires) <= +new Date()) {
                    EcdcClient.Storage.removeItem(key);
                }
            }
        }
    };

    /**
     * Get tasks or task from localStorage
     *
     * @param {Number} workerId  return task for that worker
     * @param {Number} messageId message id from message queue of that worker
     */
    EcdcClient.prototype.getTasks = function (workerId, messageId) {
        for (var i = 0, c = EcdcClient.Storage.length, key, item; i < c; i++) {
            key = EcdcClient.Storage.key(i);
            if (this.isMyTaskData(key)) {
                try {
                    item = window.JSON.parse(EcdcClient.Storage.getItem(key));
                } catch (e) {
                    item = undefined;
                }
                // If bad
                if (typeof item !== 'object') {
                    EcdcClient.Storage.removeItem(key);
                    continue;
                }
                // Task is in progress and not expires but it calculates too long...
                if (item.state === 'progress' && +new Date(item.time) <= +new Date() && +new Date(item.expires) > +new Date()) {
                    // touch item
                    item.time = new Date(+new Date() + this.MAX_TASK_COMPUTING_TIME).toString();
                    // push item
                    EcdcClient.Storage.setItem(key, JSON.stringify(item));
                    // Task found
                    this.workers[workerId].postMessage(JSON.stringify({
                        message: 'getTasks',
                        data: [item],
                        id: messageId
                    }));
                    return;
                }
            }
        }
        
        // Not locally found
        this.workers[workerId].postMessage(JSON.stringify({
            message: 'getTasks',
            data: [],
            id: messageId
        }));
    };

    /**
     * Monitors global lock
     */
    EcdcClient.prototype._monitorLock = function () {
        var self = this;

        function checkLock() {
            var lock = JSON.parse(EcdcClient.Storage.getItem('lock') || '{}');
            // Its own lock, update it
            if (!lock.clientId || lock.clientId === self.clientId) {
                EcdcClient.Storage.setItem('lock', JSON.stringify({
                    clientId: self.clientId,
                    expires: new Date(+new Date() + 10000).toString()
                }));
                // not locked
                if (self.isLocked) {
                    self.isLocked = false;
                    self.start();
                    self.onUnlock();
                }
            } else {
                // its other lock and it expires
                if (+new Date(lock.expires) < +new Date()) {
                    // update with ours
                    EcdcClient.Storage.setItem('lock', JSON.stringify({
                        clientId: self.clientId,
                        expires: new Date(+new Date() + 10000).toString()
                    }));

                    // not locked
                    if (self.isLocked) {
                        self.isLocked = false;
                        self.start();
                        self.onUnlock();
                    }
                } else {
                    // locked
                    if (!self.isLocked) {
                        self.isLocked = true;
                        self.pause();
                        self.onLock();
                    }
                }
            }
        }

        window.setInterval(checkLock, 5000);
        checkLock();
    };

    // @todo replace methods with event listener

    /**
     * If 403
     *
     * @event
     * @param {Number} workerId
     */
    EcdcClient.prototype.onUnauthorized = function (workerId) {};

    /**
     * Worker get empty task list
     *
     * @event
     * @param {Number} workerId
     */
    EcdcClient.prototype.onNoTasks = function (workerId) {};

    /**
     * Client locked another client calculates tasks
     *
     * @event
     */
    EcdcClient.prototype.onLock = function () {};

    /**
     * Client unlocked another client stops calculates tasks
     *
     * @event
     */
    EcdcClient.prototype.onUnlock = function () {};

    return EcdcClient;
}(window));