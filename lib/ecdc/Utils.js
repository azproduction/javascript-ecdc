/**
 * @fileOverview JavaScript ECDC Utils
 *
 * @author  azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 * @version 0.1a
 */

(function(exports){

function packDigit (digit) {
    var result = [0, 0, 0, 0];
    digit = digit.toExponential(6).split('e');
    result[3] = 127 + +digit[1] + 1; // mantisa

    digit = +digit[0].replace('.', '');
    result[2] = digit & 255;
    result[1] = (digit >> 8) & 255;
    result[0] = (digit >> 16) & 255;

    return result;
}

function unpackDigit(array) {
    return ((array[0] << 16) | (array[1] << 8) | (array[2])) / Math.pow(10, array[3] - 127);
}

exports.Utils = {
    packDigit: packDigit,
    unpackDigit: unpackDigit
};

}(typeof exports === 'undefined' ? this : exports));