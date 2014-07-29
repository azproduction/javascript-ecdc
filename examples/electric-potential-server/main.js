/**
 * @fileOverview Bootstrap
 *
 * @author azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 */
var client = new EcdcClient({
    script: '/ElectricPotentialWorker.js', // Worker script
    count: 2,                   // Workers count
    autoStart: false            // Auto start?
});

client.start();
