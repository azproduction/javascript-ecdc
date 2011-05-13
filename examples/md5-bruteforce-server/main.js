/**
 * @fileOverview Bootstrap
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */
(function(){

var $status = document.getElementById('status');
var lastStatus = $status.innerHTML;

EcdcClient.prototype.checkAuthorized = function () {
    return !!document.cookie.match(/ecdcuid/);
};

EcdcClient.prototype.onUnauthorized = function (workerId) {
    $status.innerHTML = 'You are unauthorized. <a href="/login.html">Login</a>';
    lastStatus = $status.innerHTML;
};

EcdcClient.prototype.onNoTasks = function (workerId) {
    $status.innerHTML = 'No tasks. <a href="/stat.html" target="_blank">Details</a>';
    lastStatus = $status.innerHTML;
};

EcdcClient.prototype.onLock = function () {
    $status.innerHTML = 'Client locked. <a href="/stat.html" target="_blank">Details</a>';
};

EcdcClient.prototype.onUnlock = function () {
    $status.innerHTML = lastStatus;
};

var client = new EcdcClient({
    script: '/Md5BruteForceWorker.js', // Worker script
    count: 1,                   // Workers count
    autoStart: false            // Auto start?
});

if (client.checkAuthorized()) {
    lastStatus = 'You are calculating md5. <a href="/stat.html" target="_blank">Details</a>';
    if (!client.isLocked) {
        $status.innerHTML = lastStatus;
        client.start();
    }
} else {
    client.onUnauthorized();
}

}());