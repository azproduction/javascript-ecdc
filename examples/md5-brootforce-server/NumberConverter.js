/**
 * Converts from 10th Numeral system to Nth up to 96 (alphabet.length) and back
 *
 * @author azproduction
 */
(function (exports) {

    var alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/*-\\?=`~!@#$%^&*()_{}[];:'\"|.,<> ";
    var alphabetLength = alphabet.length;
    var alphabetKeys = function () {
        var result = {};
        for (var i = 0; i < alphabetLength; i++) {
            result[alphabet.charAt(i)] = i;
        }
        return result;
    }();

    function fromNto10 (string, base) {
        if (base > alphabetLength) {
            base = alphabetLength;
        }
        if (base < 2) {
            base = 2;
        }
        string = string + '';
        var result = 0;
        for (var i = 0, c = string.length; i < c; i++) {
            result += alphabetKeys[string.charAt(i)] * Math.pow(base, c - i - 1);
        }
        return result;
    }

    function from10toN (number, base) {
        if (base > alphabetLength) {
            base = alphabetLength;
        }
        if (base < 2) {
            base = 2;
        }
        var result = '';
        while (number > 0) {
            result = alphabet.charAt(number % base) + result;
            number = Math.floor(number / base);
        }
        return result;
    }

    exports.fromNto10 = fromNto10;
    exports.from10toN = from10toN;

}(typeof exports === "undefined" ? this : exports));