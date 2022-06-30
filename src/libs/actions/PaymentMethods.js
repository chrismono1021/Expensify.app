import _ from 'underscore';
import {createRef} from 'react';
import lodashGet from 'lodash/get';
import Onyx from 'react-native-onyx';
import ONYXKEYS from '../../ONYXKEYS';
import * as DeprecatedAPI from '../deprecatedAPI';
import * as API from '../API';
import CONST from '../../CONST';
import Growl from '../Growl';
import * as Localize from '../Localize';
import Navigation from '../Navigation/Navigation';
import * as CardUtils from '../CardUtils';
import NameValuePair from './NameValuePair';
import * as store from './ReimbursementAccount/store';
import ROUTES from '../../ROUTES';

/**
 * Deletes a debit card
 *
 * @param {Number} fundID
 *
 * @returns {Promise}
 */
function deleteDebitCard(fundID) {
    return DeprecatedAPI.DeleteFund({fundID})
        .then((response) => {
            if (response.jsonCode === 200) {
                Growl.show(Localize.translateLocal('paymentsPage.deleteDebitCardSuccess'), CONST.GROWL.SUCCESS, 3000);
                Onyx.merge(ONYXKEYS.CARD_LIST, {[fundID]: null});
            } else {
                Growl.show(Localize.translateLocal('common.genericErrorMessage'), CONST.GROWL.ERROR, 3000);
            }
        })
        .catch(() => {
            Growl.show(Localize.translateLocal('common.genericErrorMessage'), CONST.GROWL.ERROR, 3000);
        });
}

function deletePayPalMe() {
    NameValuePair.set(CONST.NVP.PAYPAL_ME_ADDRESS, '');
    Onyx.set(ONYXKEYS.NVP_PAYPAL_ME_ADDRESS, null);
    Growl.show(Localize.translateLocal('paymentsPage.deletePayPalSuccess'), CONST.GROWL.SUCCESS, 3000);
}

/**
 * Sets up a ref to an instance of the KYC Wall component.
 */
const kycWallRef = createRef();

/**
 * When we successfully add a payment method or pass the KYC checks we will continue with our setup action if we have one set.
 */
function continueSetup() {
    if (!kycWallRef.current || !kycWallRef.current.continue) {
        Navigation.goBack();
        return;
    }

    // Close the screen (Add Debit Card, Add Bank Account, or Enable Payments) on success and continue with setup
    Navigation.goBack();
    kycWallRef.current.continue();
}

/**
 * Clears local reimbursement account if it doesn't exist in bankAccounts
 * @param {Object[]} bankAccounts
 */
function cleanLocalReimbursementData(bankAccounts) {
    const bankAccountID = lodashGet(store.getReimbursementAccountInSetup(), 'bankAccountID');

    // We check if the bank account list doesn't have the reimbursementAccount
    if (!_.find(bankAccounts, bankAccount => bankAccount.bankAccountID === bankAccountID)) {
        Onyx.merge(ONYXKEYS.REIMBURSEMENT_ACCOUNT, {achData: null, shouldShowResetModal: false});
    }
}

/**
 * Calls the API to get the user's bankAccountList, cardList, wallet, and payPalMe
 *
 * @returns {Promise}
 */
function getPaymentMethods() {
    Onyx.set(ONYXKEYS.IS_LOADING_PAYMENT_METHODS, true);
    return DeprecatedAPI.Get({
        returnValueList: 'bankAccountList, fundList, userWallet, nameValuePairs',
        name: 'paypalMeAddress',
        includeDeleted: false,
        includeNotIssued: false,
        excludeNotActivated: true,
    })
        .then((response) => {
            // Convert bank accounts/cards from an array of objects, to a map with the bankAccountID as the key
            const bankAccounts = _.object(_.map(lodashGet(response, 'bankAccountList', []), bankAccount => [bankAccount.bankAccountID, bankAccount]));
            const debitCards = _.object(_.map(lodashGet(response, 'fundList', []), fund => [fund.fundID, fund]));
            cleanLocalReimbursementData(bankAccounts);
            Onyx.multiSet({
                [ONYXKEYS.IS_LOADING_PAYMENT_METHODS]: false,
                [ONYXKEYS.USER_WALLET]: lodashGet(response, 'userWallet', {}),
                [ONYXKEYS.BANK_ACCOUNT_LIST]: bankAccounts,
                [ONYXKEYS.CARD_LIST]: debitCards,
                [ONYXKEYS.NVP_PAYPAL_ME_ADDRESS]:
                    lodashGet(response, ['nameValuePairs', CONST.NVP.PAYPAL_ME_ADDRESS], ''),
            });
        });
}

/**
 * Sets the default bank account or debit card for an Expensify Wallet
 *
 * @param {String} password
 * @param {Number} bankAccountID
 * @param {Number} fundID
 *
 * @returns {Promise}
 */
function setWalletLinkedAccount(password, bankAccountID, fundID) {
    return DeprecatedAPI.SetWalletLinkedAccount({
        password,
        bankAccountID,
        fundID,
    })
        .then((response) => {
            if (response.jsonCode === 200) {
                Onyx.merge(ONYXKEYS.USER_WALLET, {
                    walletLinkedAccountID: bankAccountID || fundID, walletLinkedAccountType: bankAccountID ? CONST.PAYMENT_METHODS.BANK_ACCOUNT : CONST.PAYMENT_METHODS.DEBIT_CARD,
                });
                Growl.show(Localize.translateLocal('paymentsPage.setDefaultSuccess'), CONST.GROWL.SUCCESS, 5000);
                return;
            }

            // Make sure to show user more specific errors which will help support identify the problem faster.
            switch (response.message) {
                case CONST.WALLET.ERROR.INVALID_WALLET:
                case CONST.WALLET.ERROR.NOT_OWNER_OF_BANK_ACCOUNT:
                    Growl.show(`${Localize.translateLocal('paymentsPage.error.notOwnerOfBankAccount')} ${Localize.translateLocal('common.conciergeHelp')}`, CONST.GROWL.ERROR, 5000);
                    return;
                case CONST.WALLET.ERROR.NOT_OWNER_OF_FUND:
                case CONST.WALLET.ERROR.INVALID_FUND:
                    Growl.show(`${Localize.translateLocal('paymentsPage.error.notOwnerOfFund')} ${Localize.translateLocal('common.conciergeHelp')}`, CONST.GROWL.ERROR, 5000);
                    return;
                case CONST.WALLET.ERROR.INVALID_BANK_ACCOUNT:
                    Growl.show(`${Localize.translateLocal('paymentsPage.error.invalidBankAccount')} ${Localize.translateLocal('common.conciergeHelp')}`, CONST.GROWL.ERROR, 5000);
                    return;
                default:
                    Growl.show(Localize.translateLocal('paymentsPage.error.setDefaultFailure'), CONST.GROWL.ERROR, 5000);
            }
        });
}

/**
 * Calls the API to add a new card.
 *
 * @param {Object} params
 */
function addBillingCard(params) {
    const cardMonth = CardUtils.getMonthFromExpirationDateString(params.expirationDate);
    const cardYear = CardUtils.getYearFromExpirationDateString(params.expirationDate);

    DeprecatedAPI.AddBillingCard({
        cardNumber: params.cardNumber,
        cardYear,
        cardMonth,
        cardCVV: params.securityCode,
        addressName: params.nameOnCard,
        addressZip: params.addressZipCode,
        currency: CONST.CURRENCY.USD,
        isP2PDebitCard: true,
        password: params.password,
    }).then(((response) => {
        let serverErrorMessage = '';
        if (response.jsonCode === 200) {
            const cardObject = {
                additionalData: {
                    isBillingCard: false,
                    isP2PDebitCard: true,
                },
                addressName: params.nameOnCard,
                addressState: params.addressState,
                addressStreet: params.addressStreet,
                addressZip: params.addressZipCode,
                cardMonth,
                cardNumber: CardUtils.maskCardNumber(params.cardNumber),
                cardYear,
                currency: 'USD',
                fundID: lodashGet(response, 'fundID', ''),
            };
            Onyx.merge(ONYXKEYS.CARD_LIST, [cardObject]);
            Growl.show(Localize.translateLocal('addDebitCardPage.growlMessageOnSave'), CONST.GROWL.SUCCESS, 3000);
            continueSetup();
        } else {
            serverErrorMessage = response.message ? response.message : Localize.translateLocal('addDebitCardPage.error.genericFailureMessage');
        }

        Onyx.merge(ONYXKEYS.FORMS.ADD_DEBIT_CARD_FORM, {
            isSubmitting: false,
            serverErrorMessage,
        });
    }));
}

/**
 * Resets the values for the add debit card form back to their initial states
 */
function clearDebitCardFormErrorAndSubmit() {
    Onyx.set(ONYXKEYS.FORMS.ADD_DEBIT_CARD_FORM, {
        isSubmitting: false,
        serverErrorMessage: null,
    });
}

/**
 * Call the API to transfer wallet balance.
 * @param {Number} transferAmount
 * @param {Object} paymentMethod
 * @param {*} paymentMethod.methodID
 * @param {String} paymentMethod.accountType
 */
function transferBalance(transferAmount, paymentMethod) {
    const paymentMethodIDKey = paymentMethod.accountType === CONST.PAYMENT_METHODS.BANK_ACCOUNT
        ? CONST.PAYMENT_METHOD_ID_KEYS.BANK_ACCOUNT
        : CONST.PAYMENT_METHOD_ID_KEYS.DEBIT_CARD;
    const parameters = {
        [paymentMethodIDKey]: paymentMethod.methodID,
    };

    API.write('TransferWalletBalance', parameters, {
        optimisticData: [
            {
                onyxMethod: 'merge',
                key: ONYXKEYS.WALLET_TRANSFER,
                value: {
                    transferAmount,
                    loading: true,
                    error: null,
                },
            },
        ],
        successData: [
            {
                onyxMethod: 'merge',
                key: ONYXKEYS.WALLET_TRANSFER,
                value: {
                    loading: false,
                    shouldShowTransferSuccess: true,
                },
            },
        ],
        failureData: [
            {
                onyxMethod: 'merge',
                key: ONYXKEYS.WALLET_TRANSFER,
                value: {
                    loading: false,
                    shouldShowTransferSuccess: false,
                },
            },
        ],
    });
}

function resetWalletTransferData() {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {
        selectedAccountType: '',
        selectedAccountID: null,
        filterPaymentMethodType: null,
        loading: false,
        shouldShowTransferSuccess: false,
    });
}

/**
 * @param {String} selectedAccountType
 * @param {String} selectedAccountID
 */
function saveWalletTransferAccountTypeAndID(selectedAccountType, selectedAccountID) {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {selectedAccountType, selectedAccountID});
}

/**
 * Toggles the user's selected type of payment method (bank account or debit card) on the wallet transfer balance screen.
 * @param {String} filterPaymentMethodType
 */
function saveWalletTransferMethodType(filterPaymentMethodType) {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {filterPaymentMethodType});
}

function dismissWalletConfirmModal() {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {shouldShowConfirmModal: false});
}

function dismissSuccessfulTransferBalancePage() {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {shouldShowTransferSuccess: false});
    Navigation.navigate(ROUTES.SETTINGS_PAYMENTS);
}

export {
    deleteDebitCard,
    deletePayPalMe,
    getPaymentMethods,
    setWalletLinkedAccount,
    addBillingCard,
    kycWallRef,
    continueSetup,
    clearDebitCardFormErrorAndSubmit,
    dismissSuccessfulTransferBalancePage,
    transferBalance,
    resetWalletTransferData,
    saveWalletTransferAccountTypeAndID,
    saveWalletTransferMethodType,
    dismissWalletConfirmModal,
    cleanLocalReimbursementData,
};
