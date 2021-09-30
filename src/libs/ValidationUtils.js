import moment from 'moment';
import _ from 'underscore';
import CONST from '../CONST';
import {showBankAccountFormValidationError, showBankAccountErrorModal} from './actions/BankAccounts';
import {translateLocal} from './translate';

/**
 * Validating that this is a valid address (PO boxes are not allowed)
 *
 * @param {String} value
 * @returns {Boolean}
 */
function isValidAddress(value) {
    if (!CONST.REGEX.ANY_VALUE.test(value)) {
        return false;
    }

    return !CONST.REGEX.PO_BOX.test(value);
}

/**
 * Validate date fields
 *
 * @param {String|Date} date
 * @returns {Boolean} true if valid
 */
function isValidDate(date) {
    const pastDate = moment().subtract(1000, 'years');
    const futureDate = moment().add(1000, 'years');
    const testDate = moment(date);
    return testDate.isValid() && testDate.isBetween(pastDate, futureDate);
}

/**
 * Used to validate a value that is "required".
 *
 * @param {*} value
 * @returns {Boolean}
 */
function isRequiredFulfilled(value) {
    if (_.isString(value)) {
        return !_.isEmpty(value.trim());
    }
    if (_.isDate(value)) {
        return isValidDate(value);
    }
    if (_.isArray(value) || _.isObject(value)) {
        return !_.isEmpty(value);
    }
    return Boolean(value);
}

/**
 * @param {String} zipCode
 * @returns {Boolean}
 */
function isValidZipCode(zipCode) {
    return CONST.REGEX.ZIP_CODE.test(zipCode);
}

/**
 * @param {String} ssnLast4
 * @returns {Boolean}
 */
function isValidSSNLastFour(ssnLast4) {
    return CONST.REGEX.SSN_LAST_FOUR.test(ssnLast4);
}

/**
 *
 * @param {String} date
 * @returns {Boolean}
 */
function isValidAge(date) {
    return moment().diff(moment(date), 'years') >= 18;
}

/**
 *
 * @param {String} url
 * @returns {Boolean}
 */
function isValidURL(url) {
    return CONST.REGEX.HYPERLINK.test(url);
}

/**
 * @param {Object} identity
 * @returns {Boolean}
 */
function isValidIdentity(identity) {
    if (!isValidAddress(identity.street)) {
        showBankAccountFormValidationError(translateLocal('bankAccount.error.address'));
        showBankAccountErrorModal();
        return false;
    }

    if (identity.state === '') {
        showBankAccountFormValidationError(translateLocal('bankAccount.error.addressState'));
        showBankAccountErrorModal();
        return false;
    }

    if (identity.city === '') {
        showBankAccountFormValidationError(translateLocal('bankAccount.error.addressCity'));
        showBankAccountErrorModal();
        return false;
    }

    if (!isValidZipCode(identity.zipCode)) {
        showBankAccountFormValidationError(translateLocal('bankAccount.error.zipCode'));
        showBankAccountErrorModal();
        return false;
    }

    if (!isValidDate(identity.dob)) {
        showBankAccountFormValidationError(translateLocal('bankAccount.error.dob'));
        showBankAccountErrorModal();
        return false;
    }

    if (!isValidAge(identity.dob)) {
        showBankAccountFormValidationError(translateLocal('bankAccount.error.age'));
        showBankAccountErrorModal();
        return false;
    }

    if (!isValidSSNLastFour(identity.ssnLast4)) {
        showBankAccountFormValidationError(translateLocal('bankAccount.error.ssnLast4'));
        showBankAccountErrorModal();
        return false;
    }

    return true;
}

export {
    isValidAddress,
    isValidDate,
    isValidIdentity,
    isValidZipCode,
    isRequiredFulfilled,
    isValidURL,
};
