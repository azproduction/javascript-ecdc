/**
 * @fileOverview Worker calculates square root
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */

// Import scripts in worker
importScripts('/EcdcWorker.js');

// Better create your own object!
EcdcWorker.prototype.calculate = function (id, data, callback) {
    this.log('calculate ' + id);
    setTimeout(function () {
        callback({id: id, data: data * data});
    }, 5000); // Simulate calculating...
};

EcdcWorker.prototype.MAX_TASKS_BUFFER = 5;            // Accumulates 5 tasks then post all to server
EcdcWorker.prototype.LOG_LEVEL = 0;                   // Log on/off
EcdcWorker.prototype.URL = 'http://127.0.0.1/task/';  // REST path

// We will use async version
var isSynchronous = false;
var worker = new EcdcWorker(isSynchronous); // async