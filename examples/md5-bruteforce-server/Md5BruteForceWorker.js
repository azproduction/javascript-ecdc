/**
 * @fileOverview Worker brutes md5
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */

// Import scripts in worker
importScripts('/EcdcWorker.js', '/md5.js', '/NumberConverter.js');

EcdcWorker.prototype.MAX_TASKS_BUFFER = 1; // Accumulates 1 tasks then post all to server
EcdcWorker.prototype.LOG_LEVEL = 1;        // Log on/off
EcdcWorker.prototype.URL = '/task/';       // REST path
EcdcWorker.prototype.MAX_TASK_COMPUTING_TIME = 1000 * 60 * 5; // 5 min

// Better create your own object!
/**
 * Calculates MD5
 *
 * @param {Number} id         task id
 * @param {Object} data       task data
 * @param {Number} data.max   start of passwords range eg 1
 * @param {Number} data.min   end of passwords range, eg 154778
 * @param {Number} data.base  password base eg 96 10 15 etc
 * @param {String} data.hash  password md5 hash
 *
 * @returns {Object} task result
 */
EcdcWorker.prototype.calculateSync = function (id, data) {
    var maxPasswordId = data.max,
        password,
        alphabetBase = data.base,
        hash = data.hash;

    for (var i = data.min; i <= maxPasswordId; i++) {
        // convert password id to real password
        // then take md5 from password
        password = from10toN(i, alphabetBase);
        if (md5(password) === hash) { // tada!
            return {id: id, data: password}; // found - return password
        }
    }

    return {id: id, data: ""}; // not found
};

var worker = new EcdcWorker(true);