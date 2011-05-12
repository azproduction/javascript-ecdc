/**
 *
 */
var fs = require('fs');

var static = {
    '/EcdcClient.js':           fs.readFileSync(__dirname + '/../../../lib/ecdc/EcdcClient.js'),
    '/EcdcWorker.js':           fs.readFileSync(__dirname + '/../../../lib/ecdc/EcdcWorker.js'),
    '/Md5BruteForceWorker.js':  fs.readFileSync(__dirname + '/../Md5BruteForceWorker.js'),
    '/NumberConverter.js':      fs.readFileSync(__dirname + '/../NumberConverter.js'),
    '/md5.js':                  fs.readFileSync(__dirname + '/../md5.js'),
    '/main.js':                 fs.readFileSync(__dirname + '/../main.js'),
    '/frame.html':              fs.readFileSync(__dirname + '/../frame.html'),
    '/index.html':              fs.readFileSync(__dirname + '/../index.html')
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