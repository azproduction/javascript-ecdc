/**
 *
 */

var util = require('util'),
    EcdcServer = require('../lib/ecdc/EcdcServer').EcdcServer,
    StaticController = require('./electric-potential-server/controllers/StaticController').StaticController;

var ElectricPotentialServer = function () {
    EcdcServer.call(this);
    StaticController.init(this.httpServer);
};

util.inherits(SimpleServer, EcdcServer);


exports.ElectricPotentialServer = ElectricPotentialServer;