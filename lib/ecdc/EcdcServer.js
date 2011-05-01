/**
 * @fileOverview JavaScript ECDC Server Class
 *
 * @author  azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 * @version 0.1a
 */

/**
 * JavaScript ECDC Server
 *
 * @constructor
 */
var EcdcServer = function () {

};

EcdcServer.prototype.createTasks = function (request) {
    return {
        id: Math.round(Math.random() * 1e16),
        data: Math.random(),
        expires: (new Date(+new Date() + 3 * 60 * 60 * 1000)).toString() // 3h
    };
};

EcdcServer.prototype.createUserId = function (request) {
    return Math.round(Math.random() * 1e16);
};

EcdcServer.prototype.saveTasks = function (request) {
    return true;
};

EcdcServer.prototype.isOwnUser = function (request) {
    return true;
};

exports.EcdcServer = EcdcServer;