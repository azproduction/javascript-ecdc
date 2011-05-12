/**
 * Converts from 10th Numeral system to Nth up to 96 (alphabet.length) and back
 *
 * @author azproduction
 */
(function (exports) {
        /**
         * @type String
         */
    var alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/*-\\?=`~!@#$%^&*()_{}[];:'\"|.,<> ",
        /**
         * @type Number
         */
        alphabetLength = alphabet.length,
        /**
         * Weight of symbols
         *
         * @type Object
         */
        alphabetKeys = function () {
            var result = {};
            for (var i = 0; i < alphabetLength; i++) {
                result[alphabet.charAt(i)] = i;
            }
            return result;
        }();

    /**
     * Converts from N numeric system to 10
     *
     * @param {String} string N numeric system number eg ytwer%^& or 270f -  case sense!
     * @param {Number} base system N - max length of alphabet
     */
    function fromNto10 (string, base) {
        if (!base || base > alphabetLength) {
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

    /**
     * Converts from 10 numeric system to N
     *
     * @param {Number} number 10 numeric system number
     * @param {Number} base   system N - max length of alphabet
     */
    function from10toN (number, base) {
        if (!base || base > alphabetLength) {
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