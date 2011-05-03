/**
 *
 */

var ElectricPotentialServer = require('./electric-potential-server/ElectricPotentialServer').ElectricPotentialServer;


var server = new ElectricPotentialServer();
server.httpServer.listen(80);

console.log('Electric Potential JavaScript ECDC server is listen on 0.0.0.0:80');
console.log('Browse http://127.0.0.1/index.html\n');