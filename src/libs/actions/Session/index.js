import Onyx from 'react-native-onyx';
import Str from 'expensify-common/lib/str';
import _ from 'underscore';
import lodashGet from 'lodash/get';
import ONYXKEYS from '../../../ONYXKEYS';
import redirectToSignIn from '../SignInRedirect';
import * as DeprecatedAPI from '../../deprecatedAPI';
import CONFIG from '../../../CONFIG';
import Log from '../../Log';
import PushNotification from '../../Notification/PushNotification';
import Timing from '../Timing';
import CONST from '../../../CONST';
import Navigation from '../../Navigation/Navigation';
import ROUTES from '../../../ROUTES';
import * as Localize from '../../Localize';
import UnreadIndicatorUpdater from '../../UnreadIndicatorUpdater';
import Timers from '../../Timers';
import * as Pusher from '../../Pusher/pusher';
import NetworkConnection from '../../NetworkConnection';
import * as User from '../User';
import * as Authentication from '../../Authentication';
import * as Welcome from '../Welcome';
import * as API from '../../API';
import * as NetworkStore from '../../Network/NetworkStore';
import DateUtils from '../../DateUtils';

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
        error: null,
        ..._.pick(data, 'authToken', 'accountID', 'email', 'encryptedAuthToken'),
    });
}

/**
 * Clears the Onyx store and redirects user to the sign in page
 */
function signOut() {
    Log.info('Flushing logs before signing out', true, {}, true);

    const optimisticData = [
        {
            onyxMethod: CONST.ONYX.METHOD.SET,
            key: ONYXKEYS.SESSION,
            value: null,
        },
        {
            onyxMethod: CONST.ONYX.METHOD.SET,
            key: ONYXKEYS.CREDENTIALS,
            value: null,
        },
    ];
    API.write('LogOut', {
        // Send current authToken because we will immediately clear it once triggering this command
        authToken: NetworkStore.getAuthToken(),
        partnerUserID: lodashGet(credentials, 'autoGeneratedLogin', ''),
        partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
        partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
        shouldRetry: false,
    }, {optimisticData});

    Timing.clearData();
}

function signOutAndRedirectToSignIn() {
    signOut();
    redirectToSignIn();
    Log.info('Redirecting to Sign In because signOut() was called');
}

/**
 * Resend the validation link to the user that is validating their account
 *
 * @param {String} [login]
 */
function resendValidationLink(login = credentials.login) {
    const optimisticData = [{
        onyxMethod: CONST.ONYX.METHOD.MERGE,
        key: ONYXKEYS.ACCOUNT,
        value: {
            isLoading: true,
            errors: null,
            message: null,
        },
    }];
    const successData = [{
        onyxMethod: CONST.ONYX.METHOD.MERGE,
        key: ONYXKEYS.ACCOUNT,
        value: {
            isLoading: false,
            message: Localize.translateLocal('resendValidationForm.linkHasBeenResent'),
        },
    }];
    const failureData = [{
        onyxMethod: CONST.ONYX.METHOD.MERGE,
        key: ONYXKEYS.ACCOUNT,
        value: {
            isLoading: false,
            message: null,
        },
    }];

    API.write('RequestAccountValidationLink', {email: login}, {optimisticData, successData, failureData});
}

/**
 * Checks the API to see if an account exists for the given login
 *
 * @param {String} login
 */
function beginSignIn(login) {
    const optimisticData = [
        {
            onyxMethod: CONST.ONYX.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                ...CONST.DEFAULT_ACCOUNT_DATA,
                isLoading: true,
            },
        },
    ];

    const successData = [
        {
            onyxMethod: CONST.ONYX.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                isLoading: false,
            },
        },
    ];

    const failureData = [
        {
            onyxMethod: CONST.ONYX.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                isLoading: false,
                errors: {
                    [DateUtils.getMicroseconds()]: Localize.translateLocal('loginForm.cannotGetAccountDetails'),
                },
            },
        },
    ];

    API.read('BeginSignIn', {email: login}, {optimisticData, successData, failureData});
}

/**
 *
 * Will create a temporary login for the user in the passed authenticate response which is used when
 * re-authenticating after an authToken expires.
 *
 * @param {String} authToken
 * @param {String} email
 * @return {Promise}
 */
function createTemporaryLogin(authToken, email) {
    const autoGeneratedLogin = Str.guid('expensify.cash-');
    const autoGeneratedPassword = Str.guid();

    return DeprecatedAPI.CreateLogin({
        authToken,
        partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
        partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
        partnerUserID: autoGeneratedLogin,
        partnerUserSecret: autoGeneratedPassword,
        shouldRetry: false,
        forceNetworkRequest: true,
        email,
        includeEncryptedAuthToken: true,
    })
        .then((createLoginResponse) => {
            if (createLoginResponse.jsonCode !== 200) {
                Onyx.merge(ONYXKEYS.ACCOUNT, {error: createLoginResponse.message});
                return createLoginResponse;
            }

            setSuccessfulSignInData(createLoginResponse);

            // If we have an old generated login for some reason
            // we should delete it before storing the new details
            if (credentials && credentials.autoGeneratedLogin) {
                DeprecatedAPI.DeleteLogin({
                    partnerUserID: credentials.autoGeneratedLogin,
                    partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
                    partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
                    shouldRetry: false,
                })
                    .then((response) => {
                        if (response.jsonCode === CONST.JSON_CODE.SUCCESS) {
                            return;
                        }

                        Log.hmmm('[Session] Unable to delete login', false, {message: response.message, jsonCode: response.jsonCode});
                    });
            }

            Onyx.merge(ONYXKEYS.CREDENTIALS, {
                autoGeneratedLogin,
                autoGeneratedPassword,
            });
            return createLoginResponse;
        })
        .finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {isLoading: false});
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
    const optimisticData = [
        {
            onyxMethod: CONST.ONYX.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                ...CONST.DEFAULT_ACCOUNT_DATA,
                isLoading: true,
            },
        },
    ];

    const successData = [
        {
            onyxMethod: CONST.ONYX.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                isLoading: false,
            },
        },
    ];

    const failureData = [
        {
            onyxMethod: CONST.ONYX.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                isLoading: false,
            },
        },
    ];

    API.write('SigninUser', {email: credentials.login, password, twoFactorAuthCode}, {optimisticData, successData, failureData});
}

/**
 * Uses a short lived authToken to continue a user's session from OldDot
 *
 * @param {String} email
 * @param {String} shortLivedToken
 * @param {String} exitTo
 */
function signInWithShortLivedToken(email, shortLivedToken) {
    Onyx.merge(ONYXKEYS.ACCOUNT, {...CONST.DEFAULT_ACCOUNT_DATA, isLoading: true});

    createTemporaryLogin(shortLivedToken, email)
        .then((response) => {
            if (response.jsonCode !== CONST.JSON_CODE.SUCCESS) {
                return;
            }

            User.getUserDetails();
            Onyx.merge(ONYXKEYS.ACCOUNT, {success: true});
        }).finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {isLoading: false});
        });
}

/**
 * User forgot the password so let's send them the link to reset their password
 */
function resetPassword() {
    API.write('RequestPasswordReset', {
        email: credentials.login,
    },
    {
        optimisticData: [
            {
                onyxMethod: CONST.ONYX.METHOD.MERGE,
                key: ONYXKEYS.ACCOUNT,
                value: {
                    isLoading: true,
                    forgotPassword: true,
                    message: null,
                    errors: null,
                },
            },
        ],
        successData: [
            {
                onyxMethod: CONST.ONYX.METHOD.MERGE,
                key: ONYXKEYS.ACCOUNT,
                value: {
                    isLoading: false,
                    message: Localize.translateLocal('resendValidationForm.linkHasBeenResent'),
                },
            },
        ],
        failureData: [
            {
                onyxMethod: CONST.ONYX.METHOD.MERGE,
                key: ONYXKEYS.ACCOUNT,
                value: {
                    isLoading: false,
                    message: null,
                },
            },
        ],
    });
}

/**
 * Set the password for the current account.
 * Then it will create a temporary login for them which is used when re-authenticating
 * after an authToken expires.
 *
 * @param {String} password
 * @param {String} validateCode
 * @param {Number} accountID
 */
function setPassword(password, validateCode, accountID) {
    Onyx.merge(ONYXKEYS.ACCOUNT, {...CONST.DEFAULT_ACCOUNT_DATA, isLoading: true});
    DeprecatedAPI.SetPassword({
        password,
        validateCode,
        accountID,
    })
        .then((response) => {
            if (response.jsonCode === 200) {
                createTemporaryLogin(response.authToken, response.email);
                return;
            }

            // This request can fail if the password is not complex enough
            Onyx.merge(ONYXKEYS.ACCOUNT, {error: response.message});
        })
        .finally(() => {
            Onyx.merge(ONYXKEYS.ACCOUNT, {isLoading: false});
        });
}

function invalidateCredentials() {
    Onyx.merge(ONYXKEYS.CREDENTIALS, {autoGeneratedLogin: '', autoGeneratedPassword: ''});
}

function invalidateAuthToken() {
    NetworkStore.setAuthToken('pizza');
    Onyx.merge(ONYXKEYS.SESSION, {authToken: 'pizza'});
}

/**
 * Clear the credentials and partial sign in session so the user can taken back to first Login step
 */
function clearSignInData() {
    Onyx.multiSet({
        [ONYXKEYS.ACCOUNT]: null,
        [ONYXKEYS.CREDENTIALS]: null,
    });
}

/**
 * Put any logic that needs to run when we are signed out here. This can be triggered when the current tab or another tab signs out.
 */
function cleanupSession() {
    // We got signed out in this tab or another so clean up any subscriptions and timers
    NetworkConnection.stopListeningForReconnect();
    UnreadIndicatorUpdater.stopListeningForReportChanges();
    PushNotification.deregister();
    PushNotification.clearNotifications();
    Pusher.disconnect();
    Timers.clearAll();
    Welcome.resetReadyCheck();
}

function clearAccountMessages() {
    Onyx.merge(ONYXKEYS.ACCOUNT, {
        error: '',
        success: '',
        errors: [],
        isLoading: false,
    });
}

/**
 * Calls change password and signs if successful. Otherwise, we request a new magic link
 * if we know the account email. Otherwise or finally we redirect to the root of the nav.
 * @param {String} authToken
 * @param {String} password
 */
function changePasswordAndSignIn(authToken, password) {
    Onyx.merge(ONYXKEYS.ACCOUNT, {validateSessionExpired: false});
    DeprecatedAPI.ChangePassword({
        authToken,
        password,
    })
        .then((responsePassword) => {
            if (responsePassword.jsonCode === 200) {
                signIn(password);
                return;
            }
            if (responsePassword.jsonCode === CONST.JSON_CODE.NOT_AUTHENTICATED && !credentials.login) {
                // authToken has expired, and we don't have the email set to request a new magic link.
                // send user to login page to enter email.
                Navigation.navigate(ROUTES.HOME);
                return;
            }
            if (responsePassword.jsonCode === CONST.JSON_CODE.NOT_AUTHENTICATED) {
                // authToken has expired, and we have the account email, so we request a new magic link.
                Onyx.merge(ONYXKEYS.ACCOUNT, {error: null});
                resetPassword();
                Navigation.navigate(ROUTES.HOME);
                return;
            }
            Onyx.merge(ONYXKEYS.SESSION, {error: 'setPasswordPage.passwordNotSet'});
        });
}

/**
 * @param {Number} accountID
 * @param {String} validateCode
 * @param {String} login
 * @param {String} authToken
 */
function validateEmail(accountID, validateCode) {
    Onyx.merge(ONYXKEYS.SESSION, {error: ''});
    DeprecatedAPI.ValidateEmail({
        accountID,
        validateCode,
    })
        .then((responseValidate) => {
            if (responseValidate.jsonCode === 200) {
                Onyx.merge(ONYXKEYS.CREDENTIALS, {login: responseValidate.email, authToken: responseValidate.authToken});
                return;
            }
            if (responseValidate.jsonCode === 666) {
                Onyx.merge(ONYXKEYS.ACCOUNT, {validated: true});
            }
            if (responseValidate.jsonCode === 401) {
                Onyx.merge(ONYXKEYS.SESSION, {error: 'setPasswordPage.setPasswordLinkInvalid'});
            }
        });
}

// It's necessary to throttle requests to reauthenticate since calling this multiple times will cause Pusher to
// reconnect each time when we only need to reconnect once. This way, if an authToken is expired and we try to
// subscribe to a bunch of channels at once we will only reauthenticate and force reconnect Pusher once.
const reauthenticatePusher = _.throttle(() => {
    Log.info('[Pusher] Re-authenticating and then reconnecting');
    Authentication.reauthenticate('AuthenticatePusher')
        .then(Pusher.reconnect)
        .catch(() => {
            console.debug(
                '[PusherConnectionManager]',
                'Unable to re-authenticate Pusher because we are offline.',
            );
        });
}, 5000, {trailing: false});

/**
 * @param {String} socketID
 * @param {String} channelName
 * @param {Function} callback
 */
function authenticatePusher(socketID, channelName, callback) {
    Log.info('[PusherAuthorizer] Attempting to authorize Pusher', false, {channelName});

    // We use makeRequestWithSideEffects here because we need to authorize to Pusher (an external service) each time a user connects to any channel.
    // eslint-disable-next-line rulesdir/no-api-side-effects-method
    API.makeRequestWithSideEffects('AuthenticatePusher', {
        socket_id: socketID,
        channel_name: channelName,
        shouldRetry: false,
        forceNetworkRequest: true,
    }).then((response) => {
        if (response.jsonCode === CONST.JSON_CODE.NOT_AUTHENTICATED) {
            Log.hmmm('[PusherAuthorizer] Unable to authenticate Pusher because authToken is expired');
            callback(new Error('Pusher failed to authenticate because authToken is expired'), {auth: ''});

            // Attempt to refresh the authToken then reconnect to Pusher
            reauthenticatePusher();
            return;
        }

        if (response.jsonCode !== CONST.JSON_CODE.SUCCESS) {
            Log.hmmm('[PusherAuthorizer] Unable to authenticate Pusher for reason other than expired session');
            callback(new Error(`Pusher failed to authenticate because code: ${response.jsonCode} message: ${response.message}`), {auth: ''});
            return;
        }

        Log.info(
            '[PusherAuthorizer] Pusher authenticated successfully',
            false,
            {channelName},
        );
        callback(null, response);
    }).catch((error) => {
        Log.hmmm('[PusherAuthorizer] Unhandled error: ', {channelName, error});
        callback(new Error('AuthenticatePusher request failed'), {auth: ''});
    });
}

/**
 * @param {Boolean} shouldShowComposeInput
 */
function setShouldShowComposeInput(shouldShowComposeInput) {
    Onyx.merge(ONYXKEYS.SESSION, {shouldShowComposeInput});
}

export {
    beginSignIn,
    setPassword,
    signIn,
    signInWithShortLivedToken,
    signOut,
    signOutAndRedirectToSignIn,
    resendValidationLink,
    resetPassword,
    clearSignInData,
    cleanupSession,
    clearAccountMessages,
    validateEmail,
    authenticatePusher,
    reauthenticatePusher,
    setShouldShowComposeInput,
    changePasswordAndSignIn,
    invalidateCredentials,
    invalidateAuthToken,
};
