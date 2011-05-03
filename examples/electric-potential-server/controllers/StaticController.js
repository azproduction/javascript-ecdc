/**
 *
 */
var fs = require('fs');

var static = {
    '/EcdcClient.js':    fs.readFileSync('../../../lib/ecdc/EcdcClient.js'),
    '/EcdcWorker.js':    fs.readFileSync('../../../lib/ecdc/EcdcWorker.js'),
    '/SquareRooter.js':  fs.readFileSync('../ElectricPotentialWorker.js'),
    '/main.js':          fs.readFileSync('../main.js'),
    '/frame.html':       fs.readFileSync('../frame.html'),
    '/index.html':       fs.readFileSync('../index.html')
};

var StaticController = {
    init: function (app) {
        Object.keys(static).forEach(function (path) {
            var headers = {'Content-Type': path.split('.').pop() === 'js' ? 'text/javascript' : 'text/html'};
            app.get(path, function (req, res) {
                res.send(static[path], headers);
            });
        });

        // Allias
        app.get('/', function (req, res) {
            res.send(static['/index.html'], {'Content-Type': 'text/html'});
        });
    }
};

exports.StaticController = StaticController;