sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Formats stock state based on quantity
         * @param {number} iStock - Stock quantity
         * @returns {string} State for ObjectNumber
         */
        stockState: function (iStock) {
            if (!iStock || iStock === 0) {
                return "Error";
            } else if (iStock < 10) {
                return "Warning";
            }
            return "Success";
        },

        /**
         * Formats active status text
         * @param {boolean} bActive - Active status
         * @returns {string} Status text
         */
        statusText: function (bActive) {
            return bActive ? "Active" : "Inactive";
        },

        /**
         * Formats active status state
         * @param {boolean} bActive - Active status
         * @returns {string} State for ObjectStatus
         */
        statusState: function (bActive) {
            return bActive ? "Success" : "Error";
        },

        /**
         * Formats price with currency
         * @param {number} fPrice - Price
         * @param {string} sCurrency - Currency code
         * @returns {string} Formatted price
         */
        formatPrice: function (fPrice, sCurrency) {
            if (fPrice === undefined || fPrice === null) {
                return "";
            }
            return `${sCurrency} ${fPrice.toFixed(2)}`;
        }
    };
});
