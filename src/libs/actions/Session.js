import Onyx from 'react-native-onyx';
import Str from 'expensify-common/lib/str';
import _ from 'underscore';
import ONYXKEYS from '../../ONYXKEYS';
import redirectToSignIn from './SignInRedirect';
import * as API from '../API';
import CONFIG from '../../CONFIG';
import PushNotification from '../Notification/PushNotification';
import Timing from './Timing';
import CONST from '../../CONST';
import {translate} from '../translate';
import Navigation from '../Navigation/Navigation';
import ROUTES from '../../ROUTES';

let credentials = {};
Onyx.connect({
    key: ONYXKEYS.CREDENTIALS,
    callback: val => credentials = val,
});

/**
 * Sets API data in the store when we make a successful "Authenticate"/"CreateLogin" request
 *
 * @param {Object} data
 * @param {String} data.accountID
 * @param {String} data.authToken
 * @param {String} data.email
 */
function setSuccessfulSignInData(data) {
    PushNotification.register(data.accountID);
    Onyx.merge(ONYXKEYS.SESSION, {
        shouldShowComposeInput: true,
        ..._.pick(data, 'authToken', 'accountID', 'email', 'encryptedAuthToken'),
    });
}

/**
 * Create an account for the user logging in.
 * This will send them a notification with a link to click on to validate the account and set a password
 *
 * @param {String} login
 */
function createAccount(login) {
    Onyx.merge(ONYXKEYS.SESSION, {error: ''});

    API.User_SignUp({
        email: login,
    }).then((response) => {
        if (response.jsonCode !== 200) {
            let errorMessage = response.message || `Unknown API Error: ${response.jsonCode}`;
            if (!response.message && response.jsonCode === 405) {
                errorMessage = 'Cannot create an account that is under a controlled domain';
            }
            Onyx.merge(ONYXKEYS.SESSION, {error: errorMessage});
            Onyx.merge(ONYXKEYS.CREDENTIALS, {login: null});
        }
    });
}

/**
 * Clears the Onyx store and redirects user to the sign in page
 */
function signOut() {
    if (credentials && credentials.autoGeneratedLogin) {
        // Clean up the login that we created
        API.DeleteLogin({
            partnerUserID: credentials.autoGeneratedLogin,
            partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
            partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
            doNotRetry: true,
        })
            .catch(error => Onyx.merge(ONYXKEYS.SESSION, {error: error.message}));
    }
    Timing.clearData();
    redirectToSignIn();
    console.debug('Redirecting to Sign In because signOut() was called');
}

/**
 * Reopen the account and send the user a link to set password
 *
 * @param {String} [login]
 */
function reopenAccount(login = credentials.login) {
    Onyx.merge(ONYXKEYS.ACCOUNT, {loading: true});
    API.User_ReopenAccount({email: login})
        .finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {loading: false});
        });
}

/**
 * Resend the validation link to the user that is validating their account
 *
 * @param {String} [login]
 */
function resendValidationLink(login = credentials.login) {
    Onyx.merge(ONYXKEYS.ACCOUNT, {loading: true});
    API.ResendValidateCode({email: login})
        .finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {loading: false});
        });
}

/**
 * Checks the API to see if an account exists for the given login
 *
 * @param {String} login
 */
function fetchAccountDetails(login) {
    Onyx.merge(ONYXKEYS.ACCOUNT, {...CONST.DEFAULT_ACCOUNT_DATA, loading: true});

    API.GetAccountStatus({email: login})
        .then((response) => {
            if (response.jsonCode === 200) {
                Onyx.merge(ONYXKEYS.CREDENTIALS, {
                    login: response.normalizedLogin,
                });
                Onyx.merge(ONYXKEYS.ACCOUNT, {
                    accountExists: response.accountExists,
                    requiresTwoFactorAuth: response.requiresTwoFactorAuth,
                    validated: response.validated,
                    closed: response.isClosed,
                    forgotPassword: false,
                });

                if (!response.accountExists) {
                    createAccount(login);
                } else if (response.isClosed) {
                    reopenAccount(login);
                } else if (!response.validated) {
                    resendValidationLink(login);
                }
            }
            Onyx.merge(ONYXKEYS.ACCOUNT, {error: response.message});
        })
        .catch(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {error: translate('', 'session.offlineMessage')});
        })
        .finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {loading: false});
        });
}

/**
 *
 * Will create a temporary login for the user in the passed authenticate response which is used when
 * re-authenticating after an authToken expires.
 *
 * @param {String} authToken
 * @param {String} encryptedAuthToken – Not required for the CreateLogin API call, but passed to setSuccessfulSignInData
 * @param {String} email
 */
function createTemporaryLogin(authToken, encryptedAuthToken, email) {
    const autoGeneratedLogin = Str.guid('expensify.cash-');
    const autoGeneratedPassword = Str.guid();

    API.CreateLogin({
        authToken,
        partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
        partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
        partnerUserID: autoGeneratedLogin,
        partnerUserSecret: autoGeneratedPassword,
        doNotRetry: true,
        email,
    })
        .then((createLoginResponse) => {
            if (createLoginResponse.jsonCode !== 200) {
                throw new Error(createLoginResponse.message);
            }

            setSuccessfulSignInData({...createLoginResponse, encryptedAuthToken});

            // If we have an old generated login for some reason
            // we should delete it before storing the new details
            if (credentials.autoGeneratedLogin) {
                API.DeleteLogin({
                    partnerUserID: credentials.autoGeneratedLogin,
                    partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
                    partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
                    doNotRetry: true,
                })
                    .catch(console.debug);
            }

            Onyx.merge(ONYXKEYS.CREDENTIALS, {
                autoGeneratedLogin,
                autoGeneratedPassword,
            });
        })
        .catch((error) => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {error: error.message});
        })
        .finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {loading: false});
        });
}

/**
 * Sign the user into the application. This will first authenticate their account
 * then it will create a temporary login for them which is used when re-authenticating
 * after an authToken expires.
 *
 * @param {String} password
 * @param {String} [twoFactorAuthCode]
 */
function signIn(password, twoFactorAuthCode) {
    Onyx.merge(ONYXKEYS.ACCOUNT, {...CONST.DEFAULT_ACCOUNT_DATA, loading: true});

    API.Authenticate({
        useExpensifyLogin: true,
        partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
        partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
        partnerUserID: credentials.login,
        partnerUserSecret: password,
        twoFactorAuthCode,
        email: credentials.login,
    })
        .then((authenticateResponse) => {
            const {authToken, encryptedAuthToken, email} = authenticateResponse;
            createTemporaryLogin(authToken, encryptedAuthToken, email);
        })
        .catch((error) => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {error: error.message, loading: false});
        });
}

/**
 * User forgot the password so let's send them the link to reset their password
 */
function resetPassword() {
    Onyx.merge(ONYXKEYS.ACCOUNT, {loading: true, forgotPassword: true});
    API.ResetPassword({email: credentials.login})
        .finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {loading: false});
        });
}

/**
 * Restart the sign in process by clearing everything from Onyx
 */
function restartSignin() {
    Onyx.clear();
}

/**
 * Set the password for the current account.
 * Then it will create a temporary login for them which is used when re-authenticating
 * after an authToken expires.
 *
 * @param {String} password
 * @param {String} validateCode
 * @param {String} accountID
 */
function setPassword(password, validateCode, accountID) {
    Onyx.merge(ONYXKEYS.ACCOUNT, {...CONST.DEFAULT_ACCOUNT_DATA, loading: true});

    API.SetPassword({
        password,
        validateCode,
        accountID,
    })
        .then((response) => {
            if (response.jsonCode === 200) {
                createTemporaryLogin(response.authToken, response.encryptedAuthToken, response.email);
                return;
            }

            // This request can fail if the password is not complex enough
            Onyx.merge(ONYXKEYS.ACCOUNT, {error: response.message});
        })
        .finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {loading: false});
        });
}

/**
 * This is used when a user clicks on a link from e.com that goes to this application. We want the user to be able to
 * be automatically logged into this app. If the user is not already logged into this app, then this method is called
 * in order to retrieve an authToken from e.com and be signed in.
 *
 * @param {String} accountID
 * @param {String} validateCode
 * @param {String} [twoFactorAuthCode]
 */
function continueSessionFromECom(accountID, validateCode, twoFactorAuthCode) {
    API.authenticateWithAccountID({
        accountID,
        validateCode,
        twoFactorAuthCode,
    }).then((data) => {
        // If something failed, it doesn't really matter what, send the user to the sign in form to log in normally
        if (data.jsonCode !== 200) {
            Navigation.navigate(ROUTES.HOME);
            return;
        }

        setSuccessfulSignInData(accountID, data.authToken, data.email);
    });
}

export {
    continueSessionFromECom,
    fetchAccountDetails,
    setPassword,
    signIn,
    signOut,
    reopenAccount,
    resendValidationLink,
    resetPassword,
    restartSignin,
};
