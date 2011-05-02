/**
 * @fileOverview JavaScript ECDC Utils
 *
 * @author  azproduction
 * @licence Dual licensed under the MIT or GPL Version 2 licenses
 * @version 0.1a
 */

(function(exports){

function packDigit (digit) {
    var result = '';
    digit = digit.toExponential(6).split('e');
    var mantissa = String.fromCharCode(127 + +digit[1]); // mantissa

    digit = +digit[0].replace('.', '');
    result = String.fromCharCode(digit & 255) + result;
    result = String.fromCharCode((digit >> 8) & 255) + result;
    result = String.fromCharCode((digit >> 16) & 255) + result;
    result += mantissa;

    return btoa(result);
}

function unpackDigit(string) {
    string = atob(string);
    return ((string.charCodeAt(0) << 16) |
            (string.charCodeAt(1) << 8) | (string.charCodeAt(2))) / Math.pow(10, string.charCodeAt(3) - 127);
}

exports.Utils = {
    packDigit: packDigit,
    unpackDigit: unpackDigit
};

}(typeof exports === 'undefined' ? this : exports));