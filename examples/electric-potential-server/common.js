/**
 * @author  azproduction
 */

(function(exports){
/**
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

var xLength = 16,
    yLength = 16;

function getIdFromXyz (x, y, z) {
    return (z * yLength * xLength) + (y * xLength) + x + 1;
}

function getXyzFromId (id) {
    var z = ~~((id - 1) / (xLength * yLength));
    var y = Math.ceil((id - z * xLength * yLength) / xLength - 1);
    var x = id - z * xLength * yLength - y * xLength - 1;
}

exports.getIdFromXyz = getIdFromXyz;
exports.getXyzFromId = getXyzFromId;

}(typeof exports === 'undefined' ? this : exports));