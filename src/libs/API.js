import _ from 'underscore';
import CONST from '../CONST';
import CONFIG from '../CONFIG';
import getPlaidLinkTokenParameters from './getPlaidLinkTokenParameters';
import redirectToSignIn from './actions/SignInRedirect';
import isViaExpensifyCashNative from './isViaExpensifyCashNative';
import requireParameters from './requireParameters';
import Log from './Log';
import * as Network from './Network';
import updateSessionAuthTokens from './actions/Session/updateSessionAuthTokens';
import * as NetworkStore from './Network/NetworkStore';
import enhanceParameters from './Network/enhanceParameters';
import * as NetworkEvents from './Network/NetworkEvents';
import processRequest from './Network/processRequest';

/**
 * Function used to handle expired auth tokens. It re-authenticates with the API and
 * then replays the original request
 *
 * @param {String} originalCommand
 * @param {Object} [originalParameters]
 * @param {Boolean} isFromSequentialQueue
 * @returns {Promise}
 */
function reauthenticateAndRetryRequest(originalCommand, originalParameters, isFromSequentialQueue) {
    // When the authentication process is running, and more API requests will be requeued and they will
    // be performed after authentication is done.
    // Note: It's not possible to reach this code if this request originated in the SequentialQueue.
    if (NetworkStore.getIsAuthenticating()) {
        return Network.post(originalCommand, originalParameters);
    }

    // Prevent any more requests from being processed while authentication happens
    NetworkStore.setIsAuthenticating(true);

    // eslint-disable-next-line no-use-before-define
    return reauthenticate(originalCommand)
        .then(() => {
            // Now that the API is authenticated, make the original request again with the new authToken
            const params = enhanceParameters(originalCommand, originalParameters);

            // If this is from the sequential queue bypass the main queue and run immediately
            if (isFromSequentialQueue) {
                return processRequest({
                    command: originalCommand,
                    data: params,
                    type: CONST.NETWORK.METHOD.POST,
                }, true);
            }

            return Network.post(originalCommand, params);
        })
        .catch(() => {
            // If we're in the SequentialQueue we do not want to put this request back into the main queue so we'll throw an error that can be handled by the SequentialQueue itself.
            if (isFromSequentialQueue) {
                throw new Error(CONST.ERROR.UNABLE_TO_REAUTHENTICATE);
            }

            // If the request did not succeed because of a networking issue or the server did not respond requeue the
            // original request.
            return Network.post(originalCommand, originalParameters);
        });
}

// We set the logger for Network here so that we can avoid a circular dependency
NetworkEvents.registerLogHandler(() => Log);

// When an authToken expires we handle it from inside API so we can access the reauthenticate and Network.post() methods
NetworkEvents.onAuthTokenExpired((queuedRequest, onSuccess, onFailure, isFromSequentialQueue) => {
    reauthenticateAndRetryRequest(queuedRequest.command, queuedRequest.data, isFromSequentialQueue)
        .then(onSuccess)
        .catch(onFailure);
});

/**
 * @param {Object} parameters
 * @param {Boolean} [parameters.useExpensifyLogin]
 * @param {String} parameters.partnerName
 * @param {String} parameters.partnerPassword
 * @param {String} parameters.partnerUserID
 * @param {String} parameters.partnerUserSecret
 * @param {String} [parameters.twoFactorAuthCode]
 * @param {String} [parameters.email]
 * @param {String} [parameters.authToken]
 * @returns {Promise}
 */
function Authenticate(parameters) {
    const commandName = 'Authenticate';

    requireParameters([
        'partnerName',
        'partnerPassword',
        'partnerUserID',
        'partnerUserSecret',
    ], parameters, commandName);

    return Network.post(commandName, {
        // When authenticating for the first time, we pass useExpensifyLogin as true so we check
        // for credentials for the expensify partnerID to let users Authenticate with their expensify user
        // and password.
        useExpensifyLogin: parameters.useExpensifyLogin,
        partnerName: parameters.partnerName,
        partnerPassword: parameters.partnerPassword,
        partnerUserID: parameters.partnerUserID,
        partnerUserSecret: parameters.partnerUserSecret,
        twoFactorAuthCode: parameters.twoFactorAuthCode,
        authToken: parameters.authToken,
        shouldRetry: false,

        // Force this request to be made because the network queue is paused when re-authentication is happening
        forceNetworkRequest: true,

        // Add email param so the first Authenticate request is logged on the server w/ this email
        email: parameters.email,
    })
        .then((response) => {
            // If we didn't get a 200 response from Authenticate we either failed to Authenticate with
            // an expensify login or the login credentials we created after the initial authentication.
            // In both cases, we need the user to sign in again with their expensify credentials
            if (response.jsonCode !== 200) {
                switch (response.jsonCode) {
                    case 401:
                        throw new Error('passwordForm.error.incorrectLoginOrPassword');
                    case 402:
                        // If too few characters are passed as the password, the WAF will pass it to the API as an empty
                        // string, which results in a 402 error from Auth.
                        if (response.message === '402 Missing partnerUserSecret') {
                            throw new Error('passwordForm.error.incorrectLoginOrPassword');
                        }
                        throw new Error('passwordForm.error.twoFactorAuthenticationEnabled');
                    case 403:
                        if (response.message === 'Invalid code') {
                            throw new Error('passwordForm.error.incorrect2fa');
                        }
                        throw new Error('passwordForm.error.invalidLoginOrPassword');
                    case 404:
                        throw new Error('passwordForm.error.unableToResetPassword');
                    case 405:
                        throw new Error('passwordForm.error.noAccess');
                    case 413:
                        throw new Error('passwordForm.error.accountLocked');
                    default:
                        throw new Error('passwordForm.error.fallback');
                }
            }
            return response;
        });
}

/**
 * Reauthenticate using the stored credentials and redirect to the sign in page if unable to do so.
 *
 * @param {String} [command] command name for loggin purposes
 * @returns {Promise}
 */
function reauthenticate(command = '') {
    const credentials = NetworkStore.getCredentials();
    return Authenticate({
        useExpensifyLogin: false,
        partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
        partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
        partnerUserID: credentials.autoGeneratedLogin,
        partnerUserSecret: credentials.autoGeneratedPassword,
    })
        .then((response) => {
            // If authentication fails throw so that we hit
            // the catch below and redirect to sign in
            if (response.jsonCode !== 200) {
                throw new Error(response.message);
            }

            // Update authToken in Onyx and in our local variables so that API requests will use the
            // new authToken
            updateSessionAuthTokens(response.authToken, response.encryptedAuthToken);

            // Note: It is important to manually set the authToken that is in the store here since any requests that are hooked into
            // reauthenticate .then() will immediate post and use the local authToken. Onyx updates subscribers lately so it is not
            // enough to do the updateSessionAuthTokens() call above.
            NetworkStore.setAuthToken(response.authToken);

            // The authentication process is finished so the network can be unpaused to continue
            // processing requests
            NetworkStore.setIsAuthenticating(false);
        })

        .catch((error) => {
            // If authentication fails, then the network can be unpaused
            NetworkStore.setIsAuthenticating(false);

            // When a fetch() fails and the "API is offline" error is thrown we won't log the user out. Most likely they
            // have a spotty connection and will need to try to reauthenticate when they come back online. We will
            // re-throw this error so it can be handled by callers of reauthenticate().
            if (error.message === CONST.ERROR.API_OFFLINE) {
                throw error;
            }

            // If we experience something other than a network error then redirect the user to sign in
            redirectToSignIn(error.message);

            Log.hmmm('Redirecting to Sign In because we failed to reauthenticate', {
                command,
                error: error.message,
            });
        });
}

/**
 * @param {Object} parameters
 * @returns {Promise}
 */
function AddBillingCard(parameters) {
    const commandName = 'User_AddBillingCard';
    return Network.post(commandName, parameters, CONST.NETWORK.METHOD.POST, true);
}

/**
 * @param {{password: String, oldPassword: String}} parameters
 * @param {String} parameters.authToken
 * @param {String} parameters.password
 * @returns {Promise}
 */
function ChangePassword(parameters) {
    const commandName = 'ChangePassword';
    requireParameters(['password'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {object} parameters
 * @param {string} parameters.emailList
 * @returns {Promise}
 */
function CreateChatReport(parameters) {
    const commandName = 'CreateChatReport';
    requireParameters(['emailList'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.email
 * @returns {Promise}
 */
function User_SignUp(parameters) {
    const commandName = 'User_SignUp';
    requireParameters([
        'email',
    ], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.authToken
 * @param {String} parameters.partnerName
 * @param {String} parameters.partnerPassword
 * @param {String} parameters.partnerUserID
 * @param {String} parameters.partnerUserSecret
 * @param {Boolean} [parameters.shouldRetry]
 * @param {String} [parameters.email]
 * @returns {Promise}
 */
function CreateLogin(parameters) {
    const commandName = 'CreateLogin';
    requireParameters([
        'authToken',
        'partnerName',
        'partnerPassword',
        'partnerUserID',
        'partnerUserSecret',
    ], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.fundID
 * @returns {Promise}
 */
function DeleteFund(parameters) {
    const commandName = 'DeleteFund';
    requireParameters(['fundID'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.partnerUserID
 * @param {String} parameters.partnerName
 * @param {String} parameters.partnerPassword
 * @param {Boolean} parameters.shouldRetry
 * @returns {Promise}
 */
function DeleteLogin(parameters) {
    const commandName = 'DeleteLogin';
    requireParameters(['partnerUserID', 'partnerName', 'partnerPassword', 'shouldRetry'],
        parameters, commandName);

    // Non-cancellable request: during logout, when requests are cancelled, we don't want to cancel the actual logout request
    return Network.post(commandName, {...parameters, canCancel: false});
}

/**
 * @param {Object} parameters
 * @param {String} parameters.returnValueList
 * @param {Boolean} shouldUseSecure
 * @returns {Promise}
 */
function Get(parameters, shouldUseSecure = false) {
    const commandName = 'Get';
    requireParameters(['returnValueList'], parameters, commandName);
    return Network.post(commandName, parameters, CONST.NETWORK.METHOD.POST, shouldUseSecure);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.email
 * @param {Boolean} parameters.forceNetworkRequest
 * @returns {Promise}
 */
function GetAccountStatus(parameters) {
    const commandName = 'GetAccountStatus';
    requireParameters(['email'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * Returns a short lived authToken for this account
 * @returns {Promise}
 */
function GetShortLivedAuthToken() {
    const commandName = 'GetShortLivedAuthToken';
    return Network.post(commandName);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.debtorEmail
 * @returns {Promise}
 */
function GetIOUReport(parameters) {
    const commandName = 'GetIOUReport';
    requireParameters(['debtorEmail'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @returns {Promise}
 * @param {String} policyID
 */
function GetFullPolicy(policyID) {
    if (!_.isString(policyID)) {
        throw new Error('[API] Must include a single policyID with calls to API.GetFullPolicy');
    }

    const commandName = 'Get';
    const parameters = {
        returnValueList: 'policyList',
        policyIDList: policyID,
    };
    return Network.post(commandName, parameters);
}

/**
 * @returns {Promise}
 */
function GetPolicySummaryList() {
    const commandName = 'Get';
    const parameters = {
        returnValueList: 'policySummaryList',
    };
    return Network.post(commandName, parameters);
}

/**
 * @returns {Promise}
 */
function GetRequestCountryCode() {
    const commandName = 'GetRequestCountryCode';
    return Network.post(commandName);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.name
 * @param {Number} parameters.value
 * @returns {Promise}
 */
function Graphite_Timer(parameters) {
    const commandName = 'Graphite_Timer';
    requireParameters(['name', 'value'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.reportID
 * @param {String} parameters.paymentMethodType
 * @param {Object} [parameters.newIOUReportDetails]
 * @returns {Promise}
 */
function PayIOU(parameters) {
    const commandName = 'PayIOU';
    requireParameters(['reportID', 'paymentMethodType'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.reportID
 * @param {Object} [parameters.newIOUReportDetails]
 * @returns {Promise}
 */
function PayWithWallet(parameters) {
    const commandName = 'PayWithWallet';
    requireParameters(['reportID'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.emailList
 * @returns {Promise}
 */
function PersonalDetails_GetForEmails(parameters) {
    const commandName = 'PersonalDetails_GetForEmails';
    requireParameters(['emailList'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Object} parameters.details
 * @returns {Promise}
 */
function PersonalDetails_Update(parameters) {
    const commandName = 'PersonalDetails_Update';
    requireParameters(['details'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Object} parameters.name
 * @param {Object} parameters.value
 * @returns {Promise}
 */
function PreferredLocale_Update(parameters) {
    const commandName = 'PreferredLocale_Update';
    requireParameters(['name', 'value'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.socket_id
 * @param {String} parameters.channel_name
 * @returns {Promise}
 */
function Push_Authenticate(parameters) {
    const commandName = 'Push_Authenticate';
    requireParameters(['socket_id', 'channel_name'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.reportID
 * @param {String} parameters.transactionID
 * @returns {Promise}
 */
function RejectTransaction(parameters) {
    const commandName = 'RejectTransaction';
    requireParameters(['reportID', 'transactionID'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.reportComment
 * @param {Number} parameters.reportID
 * @param {String} parameters.clientID
 * @param {File|Object} [parameters.file]
 * @returns {Promise}
 */
function Report_AddComment(parameters) {
    const commandName = 'Report_AddComment';
    requireParameters(['reportComment', 'reportID', 'clientID'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.reportID
 * @returns {Promise}
 */
function Report_GetHistory(parameters) {
    const commandName = 'Report_GetHistory';
    requireParameters(['reportID'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.reportID
 * @param {Boolean} parameters.pinnedValue
 * @returns {Promise}
 */
function Report_TogglePinned(parameters) {
    const commandName = 'Report_TogglePinned';
    requireParameters(['reportID', 'pinnedValue'],
        parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.reportID
 * @param {Number} parameters.reportActionID
 * @param {String} parameters.reportComment
 * @returns {Promise}
 */
function Report_EditComment(parameters) {
    const commandName = 'Report_EditComment';
    requireParameters(['reportID', 'reportActionID', 'reportComment'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.reportID
 * @param {Number} parameters.sequenceNumber
 * @returns {Promise}
 */
function Report_UpdateLastRead(parameters) {
    const commandName = 'Report_UpdateLastRead';
    requireParameters(['reportID', 'sequenceNumber'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.reportID
 * @param {String} parameters.notificationPreference
 * @returns {Promise}
 *
 */
function Report_UpdateNotificationPreference(parameters) {
    const commandName = 'Report_UpdateNotificationPreference';
    requireParameters(['reportID', 'notificationPreference'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.email
 * @returns {Promise}
 */
function ResendValidateCode(parameters) {
    const commandName = 'ResendValidateCode';
    requireParameters(['email'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.name
 * @param {String} parameters.value
 * @returns {Promise}
 */
function SetNameValuePair(parameters) {
    const commandName = 'SetNameValuePair';
    requireParameters(['name', 'value'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {string} parameters.email
 * @returns {Promise}
 */
function ResetPassword(parameters) {
    const commandName = 'ResetPassword';
    requireParameters(['email'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.password
 * @param {String} parameters.validateCode
 * @param {Number} parameters.accountID
 * @returns {Promise}
 */
function SetPassword(parameters) {
    const commandName = 'SetPassword';
    requireParameters(['accountID', 'password', 'validateCode'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.password
 * @param {String|null} parameters.bankAccountID
 * @param {String|null} parameters.fundID
 * @returns {Promise}
 */
function SetWalletLinkedAccount(parameters) {
    const commandName = 'SetWalletLinkedAccount';
    requireParameters(['password'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.subscribed
 * @returns {Promise}
 */
function UpdateAccount(parameters) {
    const commandName = 'UpdateAccount';
    requireParameters(['subscribed'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.message
 * @returns {Promise}
 */
function User_Delete(parameters) {
    const commandName = 'User_Delete';
    return Network.post(commandName, parameters);
}

/**
 * @returns {Promise}
 */
function User_GetBetas() {
    return Network.post('User_GetBetas');
}

/**
 * @param {Object} parameters
 * @param {String} parameters.email
 * @param {Boolean} [parameters.requireCertainty]
 * @returns {Promise}
 */
function User_IsFromPublicDomain(parameters) {
    const commandName = 'User_IsFromPublicDomain';
    requireParameters(['email'], parameters, commandName);
    return Network.post(commandName, {
        ...{requireCertainty: true},
        ...parameters,
    });
}

/**
 * @param {Object} parameters
 * @param {String} parameters.email
 * @returns {Promise}
 */
function User_ReopenAccount(parameters) {
    const commandName = 'User_ReopenAccount';
    requireParameters(['email'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.email
 * @param {String} parameters.password
 * @returns {Promise}
 */
function User_SecondaryLogin_Send(parameters) {
    const commandName = 'User_SecondaryLogin_Send';
    requireParameters(['email', 'password'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {File|Object} parameters.file
 * @returns {Promise}
 */
function User_UploadAvatar(parameters) {
    const commandName = 'User_UploadAvatar';
    requireParameters(['file'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.accountID
 * @param {String} parameters.validateCode
 * @returns {Promise}
 */
function ValidateEmail(parameters) {
    const commandName = 'ValidateEmail';
    requireParameters(['accountID', 'validateCode'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * Create a new IOUTransaction
 *
 * @param {Object} parameters
 * @param {String} parameters.comment
 * @param {Array} parameters.debtorEmail
 * @param {String} parameters.currency
 * @param {String} parameters.amount
 * @returns {Promise}
 */
function CreateIOUTransaction(parameters) {
    const commandName = 'CreateIOUTransaction';
    requireParameters(['comment', 'debtorEmail', 'currency', 'amount'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * Create a new IOU Split
 *
 * @param {Object} parameters
 * @param {String} parameters.splits
 * @param {String} parameters.currency
 * @param {String} parameters.reportID
 * @param {String} parameters.amount
 * @param {String} parameters.comment
 * @returns {Promise}
 */
function CreateIOUSplit(parameters) {
    const commandName = 'CreateIOUSplit';
    requireParameters(['splits', 'currency', 'amount', 'reportID'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {String} firstName
 * @param {String} lastName
 * @param {String} dob
 * @returns {Promise}
 */
function Wallet_GetOnfidoSDKToken(firstName, lastName, dob) {
    return Network.post('Wallet_GetOnfidoSDKToken', {
        // We need to pass this so we can request a token with the correct referrer
        // This value comes from a cross-platform module which returns true for native
        // platforms and false for non-native platforms.
        isViaExpensifyCashNative,
        firstName,
        lastName,
        dob,
    }, CONST.NETWORK.METHOD.POST, true);
}

/**
 * @returns {Promise}
 */
function Plaid_GetLinkToken() {
    return Network.post('Plaid_GetLinkToken', getPlaidLinkTokenParameters(), CONST.NETWORK.METHOD.POST, true);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.currentStep
 * @param {String} [parameters.onfidoData] - JSON string
 * @param {String} [parameters.personalDetails] - JSON string
 * @param {String} [parameters.idologyAnswers] - JSON string
 * @param {Boolean} [parameters.hasAcceptedTerms]
 * @returns {Promise}
 */
function Wallet_Activate(parameters) {
    const commandName = 'Wallet_Activate';
    requireParameters(['currentStep'], parameters, commandName);
    return Network.post(commandName, parameters, CONST.NETWORK.METHOD.POST, true);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.publicToken
 * @param {Boolean} parameters.allowDebit
 * @param {String} parameters.bank
 * @returns {Promise}
 */
function BankAccount_Get(parameters) {
    const commandName = 'BankAccount_Get';
    requireParameters(['publicToken', 'allowDebit', 'bank'], parameters, commandName);
    return Network.post(commandName, parameters, CONST.NETWORK.METHOD.POST, true);
}

/**
 * @param {Object} parameters
 * @param {Object[]} parameters.employees
 * @param {String} parameters.welcomeNote
 * @param {String} parameters.policyID
 * @returns {Promise}
 */
function Policy_Employees_Merge(parameters) {
    const commandName = 'Policy_Employees_Merge';
    requireParameters(['employees', 'welcomeNote', 'policyID'], parameters, commandName);

    // Always include returnPersonalDetails to ensure we get the employee's personal details in the response
    return Network.post(commandName, {...parameters, returnPersonalDetails: true});
}

/**
 * @param {Object} parameters
 * @param {String} parameters.accountNumber
 * @param {String} parameters.addressName
 * @param {Boolean} parameters.allowDebit
 * @param {Boolean} parameters.confirm
 * @param {Boolean} parameters.isSavings
 * @param {String} parameters.password
 * @param {String} parameters.routingNumber
 * @param {String} parameters.setupType
 * @param {String} parameters.additionalData additional JSON data
 * @returns {Promise}
 */
function BankAccount_Create(parameters) {
    const commandName = 'BankAccount_Create';
    requireParameters([
        'accountNumber',
        'addressName',
        'allowDebit',
        'confirm',
        'isSavings',
        'password',
        'routingNumber',
        'setupType',
        'additionalData',
    ], parameters, commandName);
    return Network.post(commandName, parameters, CONST.NETWORK.METHOD.POST, true);
}

function BankAccount_Validate(parameters) {
    const commandName = 'ValidateBankAccount';
    requireParameters(['bankAccountID', 'validateCode'], parameters, commandName);
    return Network.post(commandName, parameters, CONST.NETWORK.METHOD.POST);
}

/**
 * @param {*} parameters
 * @returns {Promise}
 */
function BankAccount_SetupWithdrawal(parameters) {
    const commandName = 'BankAccount_SetupWithdrawal';
    let allowedParameters = [
        'currentStep', 'policyID', 'bankAccountID', 'useOnfido', 'errorAttemptsCount', 'enableCardAfterVerified',

        // data from bankAccount step:
        'setupType', 'routingNumber', 'accountNumber', 'addressName', 'plaidAccountID', 'mask', 'ownershipType', 'isSavings',
        'acceptTerms', 'bankName', 'plaidAccessToken', 'alternateRoutingNumber',

        // data from company step:
        'companyName', 'companyTaxID', 'addressStreet', 'addressCity', 'addressState', 'addressZipCode',
        'hasNoConnectionToCannabis', 'incorporationType', 'incorporationState', 'incorporationDate', 'industryCode',
        'website', 'companyPhone', 'ficticiousBusinessName',

        // data from requestor step:
        'firstName', 'lastName', 'dob', 'requestorAddressStreet', 'requestorAddressCity', 'requestorAddressState',
        'requestorAddressZipCode', 'isOnfidoSetupComplete', 'onfidoData', 'isControllingOfficer', 'ssnLast4',

        // data from ACHContract step (which became the "Beneficial Owners" step, but the key is still ACHContract as
        // it's used in several logic:
        'ownsMoreThan25Percent', 'beneficialOwners', 'acceptTermsAndConditions', 'certifyTrueInformation',
    ];

    if (!parameters.useOnfido) {
        allowedParameters = allowedParameters.concat(['passport', 'answers']);
    }

    // Only keep allowed parameters in the additionalData object
    const additionalData = _.pick(parameters, allowedParameters);

    requireParameters(['currentStep'], parameters, commandName);
    return Network.post(
        commandName, {additionalData: JSON.stringify(additionalData)},
        CONST.NETWORK.METHOD.POST,
        true,
    );
}

/**
 * @param {Object} parameters
 * @param {Number} parameters.bankAccountID
 * @param {String} parameters.ownerEmail
 * @returns {Promise}
 */
function DeleteBankAccount(parameters) {
    const commandName = 'DeleteBankAccount';
    requireParameters(['bankAccountID'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @returns {Promise}
 */
function Mobile_GetConstants(parameters) {
    const commandName = 'Mobile_GetConstants';
    requireParameters(['data'], parameters, commandName);

    // Stringify the parameters object as we cannot send an object via FormData
    const finalParameters = parameters;
    finalParameters.data = JSON.stringify(parameters.data);

    return Network.post(commandName, finalParameters);
}

/**
 * @param {Object} parameters
 * @param {Number} [parameters.latitude]
 * @param {Number} [parameters.longitude]
 * @returns {Promise}
 */
function GetLocalCurrency(parameters) {
    const commandName = 'GetLocalCurrency';
    return Network.post(commandName, parameters);
}

/**
 * @returns {Promise}
 */
function GetCurrencyList() {
    return Mobile_GetConstants({data: ['currencyList']});
}

/**
 * @returns {Promise}
 */
function User_IsUsingExpensifyCard() {
    return Network.post('User_IsUsingExpensifyCard', {});
}

/**
 * @param {Object} parameters
 * @param {String} [parameters.type]
 * @param {String} [parameters.policyName]
 * @returns {Promise}
 */
function Policy_Create(parameters) {
    const commandName = 'Policy_Create';
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.policyID
 * @param {String} parameters.value
 * @returns {Promise}
 */
function Policy_CustomUnit_Update(parameters) {
    const commandName = 'Policy_CustomUnit_Update';
    requireParameters(['policyID', 'customUnit'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.policyID
 * @param {String} parameters.customUnitID
 * @param {String} parameters.value
 * @returns {Promise}
 */
function Policy_CustomUnitRate_Update(parameters) {
    const commandName = 'Policy_CustomUnitRate_Update';
    requireParameters(['policyID', 'customUnitID', 'customUnitRate'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} [parameters.policyID]
 * @returns {Promise}
 */
function Policy_Delete(parameters) {
    const commandName = 'Policy_Delete';
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.policyID
 * @param {Array} parameters.emailList
 * @returns {Promise}
 */
function Policy_Employees_Remove(parameters) {
    const commandName = 'Policy_Employees_Remove';
    requireParameters(['policyID', 'emailList'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.taskID
 * @param {String} parameters.policyID
 * @param {String} parameters.firstName
 * @param {String} parameters.lastName
 * @param {String} parameters.phoneNumber
 * @returns {Promise}
 */
function Inbox_CallUser(parameters) {
    const commandName = 'Inbox_CallUser';
    requireParameters(['taskID', 'policyID', 'firstName', 'lastName', 'phoneNumber'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * Get the current wait time in minutes for an inbox call
 * @returns {Promise}
 */
function Inbox_CallUser_WaitTime() {
    const commandName = 'Inbox_CallUser_WaitTime';
    return Network.post(commandName);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.reportIDList
 * @returns {Promise}
 */
function GetReportSummaryList(parameters) {
    const commandName = 'Get';
    requireParameters(['reportIDList'], parameters, commandName);
    return Network.post(commandName, {...parameters, returnValueList: 'reportSummaryList'});
}

/**
 * @param {Object} parameters
 * @param {String} parameters.policyID
 * @param {String} parameters.value - Must be a JSON stringified object
 * @returns {Promise}
 */
function UpdatePolicy(parameters) {
    const commandName = 'UpdatePolicy';
    requireParameters(['policyID', 'value'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * @param {Object} parameters
 * @param {String} parameters.policyID
 * @param {String} parameters.reportName
 * @param {String} parameters.visibility
 * @return {Promise}
 */
function CreatePolicyRoom(parameters) {
    const commandName = 'CreatePolicyRoom';
    requireParameters(['policyID', 'reportName', 'visibility'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * Renames a user-created policy room
 * @param {Object} parameters
 * @param {String} parameters.reportID
 * @param {String} parameters.reportName
 * @return {Promise}
 */
function RenameReport(parameters) {
    const commandName = 'RenameReport';
    requireParameters(['reportID', 'reportName'], parameters, commandName);
    return Network.post(commandName, parameters);
}

/**
 * Transfer Wallet balance and takes either the bankAccoundID or fundID
 * @param {Object} parameters
 * @param {String} [parameters.bankAccountID]
 * @param {String} [parameters.fundID]
 * @returns {Promise}
 */
function TransferWalletBalance(parameters) {
    const commandName = 'TransferWalletBalance';
    if (!parameters.bankAccountID && !parameters.fundID) {
        throw new Error('Must pass either bankAccountID or fundID to TransferWalletBalance');
    }
    return Network.post(commandName, parameters);
}

/**
 * Fetches the filename of the user's statement
 * @param {Object} parameters
 * @param {String} [parameters.period]
 * @return {Promise}
 */
function GetStatementPDF(parameters) {
    const commandName = 'GetStatementPDF';
    return Network.post(commandName, parameters);
}

export {
    Authenticate,
    AddBillingCard,
    BankAccount_Create,
    BankAccount_Get,
    BankAccount_SetupWithdrawal,
    BankAccount_Validate,
    ChangePassword,
    CreateChatReport,
    CreateLogin,
    CreatePolicyRoom,
    RenameReport,
    DeleteFund,
    DeleteLogin,
    DeleteBankAccount,
    Get,
    GetAccountStatus,
    GetShortLivedAuthToken,
    GetStatementPDF,
    GetIOUReport,
    GetFullPolicy,
    GetPolicySummaryList,
    GetReportSummaryList,
    GetRequestCountryCode,
    Graphite_Timer,
    Inbox_CallUser,
    Inbox_CallUser_WaitTime,
    PayIOU,
    PayWithWallet,
    PersonalDetails_GetForEmails,
    PersonalDetails_Update,
    Plaid_GetLinkToken,
    Policy_Employees_Merge,
    Push_Authenticate,
    RejectTransaction,
    Report_AddComment,
    Report_GetHistory,
    Report_TogglePinned,
    Report_EditComment,
    Report_UpdateLastRead,
    Report_UpdateNotificationPreference,
    ResendValidateCode,
    ResetPassword,
    SetNameValuePair,
    SetPassword,
    SetWalletLinkedAccount,
    UpdateAccount,
    UpdatePolicy,
    User_SignUp,
    User_Delete,
    User_GetBetas,
    User_IsFromPublicDomain,
    User_IsUsingExpensifyCard,
    User_ReopenAccount,
    User_SecondaryLogin_Send,
    User_UploadAvatar,
    reauthenticate,
    CreateIOUTransaction,
    CreateIOUSplit,
    ValidateEmail,
    Wallet_Activate,
    Wallet_GetOnfidoSDKToken,
    TransferWalletBalance,
    GetLocalCurrency,
    GetCurrencyList,
    Policy_Create,
    Policy_CustomUnit_Update,
    Policy_CustomUnitRate_Update,
    Policy_Employees_Remove,
    PreferredLocale_Update,
    Policy_Delete,
};
