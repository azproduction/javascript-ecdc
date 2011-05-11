/**
 * @fileOverview Worker brutes md5
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */

// Import scripts in worker
importScripts('/EcdcWorker.js', '/md5.js', '/NumberConverter.js');

var Md5BruteForceWorker = function () {
    // Sync worker
    EcdcWorker.call(this, true);
};

// Better create your own object!
Md5BruteForceWorker.prototype.calculateSync = function (id, data) {
    var maxPasswordId = data.max,
        password,
        alphabetBase = data.base,
        hash = data.hash;

    for (var i = data.min; maxPasswordId; i++) {
        // convert password id to real password
        // then take md5 from password
        password = from10toN(i, alphabetBase);
        if (md5(password) === hash) { // tada!
            return {id: id, data: password}; // found - return password
        }
    }

    return {id: id, data: ""}; // not found
};

Md5BruteForceWorker.prototype.MAX_TASKS_BUFFER = 1;            // Accumulates 1 tasks then post all to server
Md5BruteForceWorker.prototype.LOG_LEVEL = 0;                   // Log on/off
Md5BruteForceWorker.prototype.URL = '/task/';  // REST path

var worker = new Md5BruteForceWorker();