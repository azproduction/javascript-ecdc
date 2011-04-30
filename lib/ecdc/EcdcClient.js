/**
 * @fileOverview JavaScript ECDC Client Class
 *
 * @author  azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 * @version 0.1a
 */
var EcdcClient = (function(window) {
    /**
     * JavaScript ECDC Client
     *
     * @constructor
     * @param {Object} [options]
     * @param {String} [options.script='worker.js'] Workers script
     * @param {Number} [options.count=1]            Workers count
     */
    var EcdcClient = function (options) {
        options = options || {};
        options.count = this.isActive() ? (options.count || 1) : 0;
        options.script = options.script || 'worker.js';

        this.workers = [];
        this.workersMap = [];

        var i = options.count,
            worker,
            self = this;

        while (i--) {
            (function(workerId){
                worker = new Worker(options.script);
                worker.addEventListener('message', function (event) {
                    self.onWorkerMessage(workerId, event.data);
                }, false);
                worker.addEventListener('error', function (error) {
                    self.onWorkerError(workerId, error);
                }, false);
            }(i));
        }

        if (options.autostart) {
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
        console && console.error('Worker %d throws error %s', workerId, error);
    };

    /**
     * Worker send message
     */
    EcdcClient.prototype.onWorkerMessage = function (workerId, data) {
        console && console.log('Worker %d send message %s', workerId, data);
    };

    /**
     * Post message to all workers
     *
     * @param {String} message
     */
    EcdcClient.prototype.broadcast = function (message) {
        for (var i = 0, c = this.workers.length; i < c; i++) {
            this.workers[i].postMessage(message);
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

    return EcdcClient;
}(window));