/**
 * @fileOverview JavaScript ECDC Client's Worker Class
 *
 * @author  azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 * @version 0.1a
 */
var EcdcWorker = (function(global) {

    /**
     * @constructor
     * @namespace
     *
     * @param {Boolean} [isSynchronous=false]
     */
    var EcdcWorker = function (isSynchronous) {
        /**
         * Synchronous or not
         *
         * Default true
         *
         * @type Boolean
         */
        this.isSynchronous = isSynchronous || false;
        /**
         * Not active by default
         *
         * @type Boolean
         */
        this.active = false;
        /**
         * @type Boolean
         */
        this.isActivatedByUnsentTasks = false;
        /**
         * Is looking for local tasks (in localStorage)
         *
         * @type Boolean
         */
        this.isCheckLocalTasks = true;
        /**
         * Retry timeout
         *
         * @type Number
         */
        this.taskTimeut = this.GET_TASK_TIMEOUT;
        /**
         * Complete but unsent tasks buffer
         *
         * @type Object[]
         */
        this.tasksBuffer = [];

        this.observeMessage();
    };

    /**
     * Max tasks in buffer
     *
     * @const
     * @type Number
     */
    EcdcWorker.prototype.MAX_TASKS_BUFFER = 1;
    /**
     * Log level
     *   1 - full log
     *   0 - no log
     *
     * @const
     * @type Number
     */
    EcdcWorker.prototype.LOG_LEVEL = 1;
    /**
     * Default timeout
     *
     * @const
     * @type Number
     */
    EcdcWorker.prototype.GET_TASK_TIMEOUT = 2e1;        // 2 sec
    /**
     * Default max timeout
     *
     * @const
     * @type Number
     */
    EcdcWorker.prototype.MAX_GET_TASK_TIMEOUT = 12e4;   // 2 minutes
    /**
     * Default computing time, after that time task marks as "overcomputed"
     * and other worker can gat that task
     *
     * @const
     * @type Number
     */
    EcdcWorker.prototype.MAX_TASK_COMPUTING_TIME = 6e4; // 1 minute
    /**
     * REST url
     *
     * @const
     * @type String
     */
    EcdcWorker.prototype.URL = '/task/';

    /**
     * Posts message to master
     * 
     * @private
     * @param {String} message
     */
    EcdcWorker.prototype.log = function (message) {
        if (this.LOG_LEVEL) {
            global.postMessage(JSON.stringify({message: 'log', data: message}));
        }
    };

    /**
     * Message listener
     *
     * @param {String} message
     */
    EcdcWorker.prototype.getMessage = function (data) {
        var self = this;
        
        data = JSON.parse(data);
        switch (data.message) {
            case 'start':
                this.start();
                break;
            case 'pause':
                this.pause();
                break;
            case 'unsentTasks':
                this.isActivatedByUnsentTasks = true;
                this.start();
                this.log('started via unsent tasks');
                this.postTasks(data.data, function (err, tasks) {
                    if (err !== null) {
                        self.log('error on start');
                    } else if (self.isSynchronous) {
                        self.doTasksSync(tasks);
                    } else {
                        self.doTasks(tasks);
                    }
                });
                break;
            case 'getTasks':
                MessageQueue.callListener(data.id, data.data);
                break;
        }
    };

    /**
     * Message listener
     *
     * @param {String} message
     */
    EcdcWorker.prototype.observeMessage = function () {
        var self = this;
        // Listener for master's messages
        global.addEventListener('message', function (event) {
            self.getMessage(event.data);
        }, false);
    };

    /**
     * Starts worker
     */
    EcdcWorker.prototype.start = function () {
        var self = this;
        if (!this.isActivatedByUnsentTasks) {
            this.log('started');
            this.isActivatedByUnsentTasks = false;
            this.getTasks(function (err, tasks) {
                if (err !== null) {
                    self.log('error on start');
                } else if (self.isSynchronous) {
                    self.doTasksSync(tasks);
                } else {
                    self.doTasks(tasks);
                }
            });
        }
        this.active = true;
    };

    /**
     * Pauses worker, worker allowed to finish current task
     */
    EcdcWorker.prototype.pause = function () {
        this.log('paused');
        this.active = false;
    };

    /**
     * Performs Async tasks
     *
     * Task format
     * {String} task.id            from server | any task id
     * {String} task.expires       from server | date string eg.: Sat Apr 30 2011 23:41:19 GMT+0600
     * {Object} task.data          from server | any task data
     * 
     * {String} task.state         from client | task status {progress|complete}
     * {String} task.time          from client | after that time task will be "overcalculated", format like task.expires
     * {Object} task.result        from client | task result
     * {String} task.result.id     from client | task result id must be equal task id
     * {Object} [task.result.data] from client | task result data may be another name
     *
     * @param {Object|Object[]} tasks
     */
    EcdcWorker.prototype.doTasks = function (tasks) {
        var self = this,
            results = [];

        function postAllResults(results) {
            // Post all items
            self.postTasks(results, function (err, tasks) {
                if (err === null) {
                    // Do again...
                    this.doTasks(tasks);
                } else {
                    // If some error - sleep
                    this.log('Error (' + err + ') on post tasks');
                    this.pause();
                }
            }, self);
        }

        if (!this.active) {
            return;
        }
        
        tasks = [].concat(tasks);

        var tasksCount = tasks.length;

        tasks.forEach(function (task) {
            if (!self.active) {
                return;
            }
            task.state = 'progress';
            // touch item
            task.time = new Date(+new Date() + self.MAX_TASK_COMPUTING_TIME).toString();
            // push item
            self.updateTask(task);
            // Now task marked as in progress
            // Calculate
            self.calculate(task.id, task.data, function (result) {
                // Validate
                task.result = result instanceof Object ? result : {data: {}};
                // Force add id
                task.result.id = task.id;
                // Complete task
                task.state = 'complete';
                // push item
                self.updateTask(task);
                results.push(task.result);

                tasksCount--;
                // All done
                if (tasksCount <= 0) {
                    postAllResults(results);
                }
            });
        });
    };

    /**
     * Performs Sync tasks
     *
     * @param {Object|Object[]} tasks
     */
    EcdcWorker.prototype.doTasksSync = function (tasks) {
        if (!this.active) {
            return;
        }
        tasks = [].concat(tasks);
        // Iterate...
        for (var i = 0, c = tasks.length, task, results = []; i < c; i++) {
            if (!this.active) {
                return;
            }
            task = tasks[i];
            task.state = 'progress';
            // touch item
            task.time = new Date(+new Date() + this.MAX_TASK_COMPUTING_TIME).toString();
            // push item
            this.updateTask(task);
            // Now task marked as in progress
            // Calculate
            task.result = this.calculateSync(task.id, task.data);
            // Validate
            task.result = task.result instanceof Object ? task.result : {data: {}};
            // Force add id
            task.result.id = task.id;
            // Complete task
            task.state = 'complete';
            // push item
            this.updateTask(task);
            results.push(task.result);
        }
        // Post all items
        this.postTasks(results, function (err, tasks) {
            if (err === null) {
                // Do again...
                this.doTasksSync(tasks);
            } else {
                // If some error - sleep
                this.log('Error (%s) on post tasks', err);
                this.pause();
            }
        }, this);
    };

    /**
     * Get tasks or task
     * 
     * @param {Function} callback callback(err, items)
     * @param thisObject
     */
    EcdcWorker.prototype.getTasks = function (callback, thisObject) {
        var self = this;
        
        thisObject = thisObject || null;

        // Check long tasks
        if (this.isCheckLocalTasks) {
            this.log('trying to get local tasks');
            // Try request from client's localStorage
            var id = Math.round(Math.random() * 10e16);
            this.log('Add listener to queue ' + id);
            MessageQueue.addListener(id, function (tasks) {
                 self.log('Local tasks: ' + tasks.length);
                 if (tasks && tasks.length) {
                    // There is something
                    callback.call(thisObject, null, tasks);
                 } else {
                    // No more local tasks
                    self.isCheckLocalTasks = false;
                    self.log('No local, Get tasks from server');
                    self.getTasksXhr(callback, thisObject);
                 }
            });
            this.log('postMessage getTasks');
            global.postMessage(JSON.stringify({
                message: 'getTasks',
                id: id
            }));
        } else {
            this.log('Get tasks from server');
            this.getTasksXhr(callback, thisObject);
        }
    };

    /**
     * Get tasks or task
     *
     * @param {Function} callback callback(err, items)
     * @param thisObject
     */
    EcdcWorker.prototype.getTasksXhr = function (callback, thisObject) {
        var self = this;
        
        // No local tasks found
        // Perform XHR get
        var options = {
            method: 'get',
            url: this.URL,
            callback: function (err, data) {
                if (err !== null) {
                    // Some error, retry
                    self.retry(options);
                    // Log
                    self.log('Error (' + err + ') on get task, retry...');
                } else {
                    // Ok
                    self.resetTimeout();
                    callback.call(thisObject, null, data);
                    self.log('Get new task');
                }
            }
        };
        Request(options);
    };

    /**
     * Retryes to perform request
     *
     * @param {Object} options
     */
    EcdcWorker.prototype.retry = function (options) {
        this.taskTimeut *= 2;
        if (this.taskTimeut > this.MAX_GET_TASK_TIMEOUT) {
            this.taskTimeut = this.MAX_GET_TASK_TIMEOUT;
        }
        global.setTimeout(function () {
            Request(options);
        }, this.taskTimeut);
    };

    /**
     * Resets task timeout
     */
    EcdcWorker.prototype.resetTimeout = function () {
        this.taskTimeut = this.GET_TASK_TIMEOUT;
    };

    /**
     * Cleanups expired or defined tasks
     *
     * @param {String[]} [tasksIds]
     */
    EcdcWorker.prototype.cleanupTasks = function (tasksIds) {
        global.postMessage(JSON.stringify({
            message: 'cleanupTasks',
            data: tasksIds
        }))
    };

    /**
     * Updates task in storage
     *
     * @param {Object} [task]
     */
    EcdcWorker.prototype.updateTask = function (task) {
        global.postMessage(JSON.stringify({
            message: 'updateTask',
            data: task
        }));
    };

    /**
     * Post tasks to server or collecting them in buffer
     * 
     * @param {Object[]} taskResults
     * @param {Function} callback
     * @param {Object}   thisObject
     */
    EcdcWorker.prototype.postTasks = function (taskResults, callback, thisObject) {
        var self = this,
            postVars;

        this.tasksBuffer = this.tasksBuffer.concat(taskResults);
        if (this.tasksBuffer.length < this.MAX_TASKS_BUFFER) {
            // Continue collecting tasks
            this.log('Put tasks to buffer');
            this.getTasks(callback, thisObject);
            return;
        }

        // Buffer full? send data to server
        postVars = global.JSON.stringify(this.tasksBuffer);
        var tasksIds = [];

        for (var i = 0, c = this.tasksBuffer.length; i < c; i++) {
            tasksIds.push(this.tasksBuffer[i].id);
        }

        // Clear buffer
        this.tasksBuffer = [];
        // Perform XHR Post
        var options = {
            method: 'post',
            postVars: postVars,
            url: this.URL,
            contentType: 'application/json',
            callback: function (err, data) {
                if (err !== null) {
                    self.retry(options);
                    self.log('Error (%s) on post task, retry...', err);
                } else {
                    self.resetTimeout();
                    // Get tasks
                    callback.call(thisObject, null, data);
                    // Cleanup storage
                    self.cleanupTasks(tasksIds);
                    self.log('Get new task after post');
                }
            }
        };
        Request(options);
        self.log('Post result');
    };

    /**
     * This method performs all calculation -  it synchronous
     *
     * @param {String|Number} id   task id
     * @param {Object}        data task data
     *
     * @returns {Object}
     */
    EcdcWorker.prototype.calculateSync = function (id, data) {
        // Do nothing
        this.log('calculateSync ' + id);
        return {id: id, data: data};
    };

    /**
     * This method performs all calculation - it asynchronous
     *
     * @param {String|Number} id   task id
     * @param {Object}        data task data
     * @param {Function}      callback 
     */
    EcdcWorker.prototype.calculate = function (id, data, callback) {
        // Do nothing
        this.log('calculate ' + id);
        
        global.setTimeout(function () {
            callback({id: id, data: data});
        }, 9);
    };

    /**
     * Performs XHR
     * 
     * @param {Object}   params
     * @param {String}   params.url
     * @param {Function} params.callback       callback(errorCode, json)
     * @param {String}   [params.method='get']
     * @param {Number}   [params.timeout=5000]
     * @param {String}   [params.contentType]
     *
     * @throws {Error} Callback, Url?
     */
    var Request = function (params) {
        params = params || {};
        if (!params.callback || !params.url) {
            throw new Error('Callback, Url?');
        }
        params.method = params.method || 'get';
        params.timeout = params.timeout || 5000;

        var xhr = new global.XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }
            if (global.parseInt(xhr.status) === 200) {
                global.clearTimeout(timerId);
                params.callback(null, xhr.getResponseHeader('Content-Type').match(/^application\/json/) ? JSON.parse(xhr.responseText) : xhr.responseText);
            } else {
                global.clearTimeout(timerId);
                params.callback(xhr.status);
            }
        };

        xhr.open(params.method, params.url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        if (params.contentType) {
            xhr.setRequestHeader('Content-Type', params.contentType);
        }
        xhr.send(params.method.toLowerCase() === 'post' ? params.postVars : null);

        var timerId = global.setTimeout(function(){
            xhr.abort();
            params.callback(0);
        }, params.timeout);
    };

    /**
     * Queue of messages from Client
     *
     * @namespace
     */
    var MessageQueue = {
        messages: {},
        addListener: function (id, callback) {
            this.messages[id] = callback;
        },
        callListener: function (id, data) {
            if (this.messages[id]) {
                this.messages[id](data);
                delete this.messages[id];
            } else {
                throw 'No listener ' + id;
            }
        }
    };

    return EcdcWorker;
}(this));