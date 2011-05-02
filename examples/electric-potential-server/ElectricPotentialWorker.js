/**
 * @fileOverview Worker calculates square root
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */

// Import scripts in worker
importScripts('/EcdcWorker.js');

var EPSILON_0 = 8.854187817e-12,       // Vacuum permittivity
    K = 1 / (4 * Math.PI * EPSILON_0);

/*
 * There few electric points in 10.24m x 10.24m x 10.24m cube, side 0.00 - 10.23
 *     Problem: calculate Electric potential in each point 0.01 x 0.01 x 0.01 of cube
 *     Each task: are cube 0.64 x 0.64 x 0.01 - 4096 points
 *     Total: 262 144 tasks,
 *            1 073 741 824 points,
 *            4Gb of store data - 4 byte per point,
 *            7Gb upload data w/ headers,
 *            25Mb download data w/ headers
 *
 *     Precision: 4 digits
 *
 *     Income data about 100 bytes of JSON
 *     Each task data about 28672 bytes of JSON
 *     
 *     xl = 16
 *     yl = 16
 *     zl = 1024
 *     
 *     id = (z * yl * xl) + (y * xl) + x + 1
 *
 *     z = ~~((id - 1) / (xl * yl));
 *     y = Math.ceil((id - z * xl * yl) / xl - 1);
 *     x = id - z * xl * yl - y * xl - 1;
 */

var points = [{
    xyz: [1,    7.2, 2.4],
    q: 1e-9
}, {
    xyz: [7.58, 8.2, 3.1],
    q: -3e-9
}, {
    xyz: [10.1, 3.6, 5.1],
    q: 2e-9
}, {
    xyz: [3.2,  1.9, 9.4],
    q: 5e-9
}, {
    xyz: [5.2,  4.9, 10.0],
    q: -4e-9
}];


var ElectricPotentialWorker = function () {
    EcdcWorker.call(this, true);
};

// Better create your own object!
ElectricPotentialWorker.prototype.calculateSync = function (id, data) {
    var distance,
        point,
        position,
        dx,
        dy,
        dz,
        result = [],
        potential;
    
    for (var x = data.x1, a = ~(data.x2 * 1e4); ~(x * 1e4) <= a; x += data.step) {
    for (var y = data.y1, b = ~(data.y2 * 1e4); ~(y * 1e4) <= b; y += data.step) {
    for (var z = data.z1, c = ~(data.z2 * 1e4); ~(z * 1e4) <= c; z += data.step) {

        potential = 0;
        for (var l = 0, d = points.length; l < d; l++) {
            point = points[l];
            position = point.xyz;

            dx = x - position[0];
            dy = y - position[1];
            dz = z - position[2];

            distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            potential += K * point.q / distance;
        }

        // Precision 4 digits
        result.push(~~(potential * 10000) / 10000);
        
    }}}

    return {id: id, data: result};
};

ElectricPotentialWorker.prototype.MAX_TASKS_BUFFER = 1;            // Accumulates 1 tasks then post all to server
ElectricPotentialWorker.prototype.LOG_LEVEL = 0;                   // Log on/off
ElectricPotentialWorker.prototype.URL = 'http://127.0.0.1/task/';  // REST path

var worker = new ElectricPotentialWorker();