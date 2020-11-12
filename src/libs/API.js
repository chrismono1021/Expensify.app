import _ from 'underscore';
import Onyx from 'react-native-onyx';
import Str from 'js-libs/lib/str';
import ONYXKEYS from '../ONYXKEYS';
import HttpUtils from './HttpUtils';
import NetworkConnection from './NetworkConnection';
import CONFIG from '../CONFIG';
import * as Pusher from './Pusher/pusher';
import ROUTES from '../ROUTES';
import redirectToSignIn from './actions/SignInRedirect';
import PushNotification from './Notification/PushNotification';
import expensifyAPI from './expensifyAPI';

// Queue for network requests so we don't lose actions done by the user while offline
let networkRequestQueue = [];

// Indicates if we're in the process of re-authenticating. When an API call returns jsonCode 407 indicating that the
// authToken expired, we set this to true, pause all API calls, re-authenticate, and then use the authToken fromm the
// response in the subsequent API calls
let reauthenticating = false;

let authToken;
Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: val => authToken = val ? val.authToken : null,
});

// We subscribe to changes to the online/offline status of the network to determine when we should fire off API calls
// vs queueing them for later.
let isOffline;
Onyx.connect({
    key: ONYXKEYS.NETWORK,
    callback: val => isOffline = val && val.isOffline,
});

// When the user authenticates for the first time we create a login and store credentials in Onyx.
// When the user's authToken expires we use this login to re-authenticate and get a new authToken
// and use that new authToken in subsequent API calls
let credentials;
Onyx.connect({
    key: ONYXKEYS.CREDENTIALS,
    callback: ionCredentials => credentials = ionCredentials,
});

// If we are ever being redirected to the sign in page, the user is currently unauthenticated, so we should clear the
// network request queue, to prevent DDoSing our own API
Onyx.connect({
    key: ONYXKEYS.APP_REDIRECT_TO,
    callback: (redirectTo) => {
        if (redirectTo && redirectTo.startsWith(ROUTES.SIGNIN)) {
            networkRequestQueue = [];
        }
    }
});

/**
 * Does this command require an authToken?
 *
 * @param {String} command
 * @return {Boolean}
 */
function isAuthTokenRequired(command) {
    return !_.contains(['Log'], command);
}

/**
 * Adds a request to networkRequestQueue
 *
 * @param {string} command
 * @param {mixed} data
 * @returns {Promise}
 */
function queueRequest(command, data) {
    return new Promise((resolve, reject) => {
        // Add the write request to a queue of actions to perform
        networkRequestQueue.push({
            command,
            data,
            resolve,
            reject,
        });

        // Try to fire off the request as soon as it's queued so we don't add a delay to every queued command
        // eslint-disable-next-line no-use-before-define
        processNetworkRequestQueue();
    });
}

/**
 * @param {string} login
 * @param {string} password
 * @returns {Promise}
 */
function createLogin(login, password) {
    if (!authToken) {
        throw new Error('createLogin() can\'t be called when there is no authToken');
    }

    // Using xhr instead of request becasue request has logic to re-try API commands when we get a 407 authToken expired
    // in the response, and we call CreateLogin after getting a successful resposne to Authenticate so it's unlikely
    // that we'll get a 407.
    return HttpUtils.xhr('CreateLogin', {
        authToken,
        partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
        partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
        partnerUserID: login,
        partnerUserSecret: password,
    })
        .then((response) => {
            if (response.jsonCode !== 200) {
                throw new Error(response.message);
            }

            if (credentials && credentials.login) {
                // If we have an old login for some reason, we should delete it before storing the new details
                expensifyAPI.deleteLogin({
                    partnerUserID: credentials.login,
                    partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
                    partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
                    doNotRetry: true,
                })
                    .catch(error => Onyx.merge(ONYXKEYS.SESSION, {error: error.message}));
            }

            Onyx.merge(ONYXKEYS.CREDENTIALS, {login, password});
        });
}

/**
 * Makes an API request.
 *
 * For most API commands if we get a 407 jsonCode in the response, which means the authToken
 * expired, this function automatically makes an API call to Authenticate and get a fresh authToken, and retries the
 * original API command
 *
 * @param {string} command
 * @param {object} parameters
 * @param {string} [type]
 * @returns {Promise}
 */
function request(command, parameters, type = 'post') {
    // If we're in the process of re-authenticating, queue this request for after we're done re-authenticating
    if (reauthenticating) {
        return queueRequest(command, parameters);
    }

    // If we end up here with no authToken it means we are trying to make
    // an API request before we are signed in. In this case, we should just
    // cancel this and all other requests and set reauthenticating to false.
    if (!authToken && isAuthTokenRequired(command)) {
        console.error('A request was made without an authToken', {command, parameters});
        reauthenticating = false;
        redirectToSignIn();
        return Promise.resolve();
    }

    // Add authToken automatically to all commands
    const parametersWithAuthToken = {...parameters, authToken};

    // Make the http request, and if we get 407 jsonCode in the response,
    // re-authenticate to get a fresh authToken and make the original http request again
    return HttpUtils.xhr(command, parametersWithAuthToken, type)
        .then((responseData) => {
            // We can end up here if we have queued up many
            // requests and have an expired authToken. In these cases,
            // we just need to requeue the request
            if (reauthenticating) {
                return queueRequest(command, parametersWithAuthToken);
            }

            // If we're not re-authenticating and we get 407 (authToken expired)
            // we re-authenticate and then re-try the original request
            if (responseData.jsonCode === 407 && parametersWithAuthToken.doNotRetry !== true) {
                reauthenticating = true;
                return HttpUtils.xhr('Authenticate', {
                    useExpensifyLogin: false,
                    partnerName: CONFIG.EXPENSIFY.PARTNER_NAME,
                    partnerPassword: CONFIG.EXPENSIFY.PARTNER_PASSWORD,
                    partnerUserID: credentials.login,
                    partnerUserSecret: credentials.password,
                    twoFactorAuthCode: ''
                })
                    .then((response) => {
                        reauthenticating = false;

                        // If authentication fails throw so that we hit
                        // the catch below and redirect to sign in
                        if (response.jsonCode !== 200) {
                            throw new Error(response.message);
                        }

                        // Update the authToken that will be used to retry the command since the one we have is expired
                        parametersWithAuthToken.authToken = response.authToken;

                        // Update authToken in Onyx store otherwise subsequent API calls will use the expired one
                        Onyx.merge(ONYXKEYS.SESSION, _.pick(response, 'authToken'));
                        return response;
                    })
                    .then(() => HttpUtils.xhr(command, parametersWithAuthToken, type))
                    .catch((error) => {
                        reauthenticating = false;
                        redirectToSignIn(error.message);
                        return Promise.reject();
                    });
            }
            return responseData;
        })
        .catch((error) => {
            // If the request failed, we need to put the request object back into the queue as long as there is no
            // doNotRetry option set in the parametersWithAuthToken
            if (parametersWithAuthToken.doNotRetry !== true) {
                queueRequest(command, parametersWithAuthToken);
            }

            // If we already have an error, throw that so we do not swallow it
            if (error instanceof Error) {
                throw error;
            }

            // Throw a generic error so we can pass the error up the chain
            throw new Error(`API Command ${command} failed`);
        });
}

/**
 * Process the networkRequestQueue by looping through the queue and attempting to make the requests
 */
function processNetworkRequestQueue() {
    if (isOffline) {
        // Two things will bring the app online again...
        // 1. Pusher reconnecting (see registerSocketEventCallback in this file)
        // 2. Getting a 200 response back from the API (happens right below)

        // Make a simple request every second to see if the API is online again
        HttpUtils.xhr('Get', {doNotRetry: true})
            .then(() => NetworkConnection.setOfflineStatus(false));
        return;
    }

    // Don't make any requests until we're done re-authenticating since we'll use the new authToken
    // from that response for the subsequent network requests
    if (reauthenticating || networkRequestQueue.length === 0) {
        return;
    }

    _.each(networkRequestQueue, (queuedRequest) => {
        request(queuedRequest.command, queuedRequest.data)
            .then(queuedRequest.resolve)
            .catch(queuedRequest.reject);
    });

    networkRequestQueue = [];
}

// Process our write queue very often
setInterval(processNetworkRequestQueue, 1000);

/**
 * Pusher.reconnect() calls disconnect and connect on the
 * Pusher socket. In some cases, the authorizer might fail
 * or an error will be returned due to an out of date authToken.
 * Reconnect will preserve our existing subscriptions and retry
 * connecting until it succeeds. We're throttling this call so
 * that we retry as few times as possible.
 */
const reconnectToPusher = _.throttle(Pusher.reconnect, 1000);

/**
 * When authTokens expire they will automatically be refreshed.
 * The authorizer helps make sure that we are always passing the
 * current valid token to generate the signed auth response
 * needed to subscribe to Pusher channels.
 */
Pusher.registerCustomAuthorizer((channel, {authEndpoint}) => ({
    authorize: (socketID, callback) => {
        console.debug('[Network] Attempting to authorize Pusher');

        const formData = new FormData();
        formData.append('socket_id', socketID);
        formData.append('channel_name', channel.name);
        formData.append('authToken', authToken);

        return fetch(authEndpoint, {
            method: 'POST',
            body: formData,
        })
            .then(authResponse => authResponse.json())
            .then(data => callback(null, data))
            .catch((error) => {
                reconnectToPusher();
                console.debug('[Network] Failed to authorize Pusher');
                callback(new Error(`Error calling auth endpoint: ${error.message}`));
            });
    },
}));

/**
 * Events that happen on the pusher socket are used to determine if the app is online or offline. The offline setting
 * is stored in Onyx so the rest of the app has access to it.
 *
 * @params {string} eventName
 */
Pusher.registerSocketEventCallback((eventName) => {
    switch (eventName) {
        case 'error':
            reconnectToPusher();
            break;
        default:
            break;
    }
});
