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

        // Force worker 0 to post unsent tasks
        this.checkUnsentTasks(0);

        if (options.autoStart) {
            this.start();
        }
    };

    /**
     * Checks if client can calculate
     */
    EcdcClient.prototype.isActive = function () {
        return typeof window.Worker !== 'undefined' &&
               typeof window.XMLHttpRequest !== 'undefined' &&
               typeof window.JSON !== 'undefined';
    };

    /**
     * Worker throws error
     */
    EcdcClient.prototype.onWorkerError = function (workerId, error) {
        console && console.error('Worker %d throws error %s', workerId, error.message);
    };

    /**
     * Worker send message
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
        this.broadcast('start');
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
     * Get tasks or task
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

    return EcdcClient;
}(window));