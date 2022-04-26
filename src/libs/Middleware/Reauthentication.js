import lodashGet from 'lodash/get';
import CONST from '../../CONST';
import * as NetworkStore from '../Network/NetworkStore';
import * as Network from '../Network';
import * as Authentication from '../Authentication';
import * as PersistedRequests from '../actions/PersistedRequests';
import * as Request from '../Request';

/**
 * Reauthentication middleware
 *
 * @param {Promise} response
 * @param {Object} request
 * @param {Boolean} isFromSequentialQueue
 * @returns {Promise}
 */
export default function (response, request, isFromSequentialQueue) {
    return response
        .then((data) => {
            if (data.jsonCode === CONST.JSON_CODE.NOT_AUTHENTICATED) {
                const credentials = NetworkStore.getCredentials();

                // Credentials haven't been initialized. We will not be able to re-authenticate with the API.
                const unableToReauthenticate = (!credentials || !credentials.autoGeneratedLogin || !credentials.autoGeneratedPassword);
                if (unableToReauthenticate) {
                    if (isFromSequentialQueue) {
                        throw new Error('Missing credentials required for authentication');
                    }

                    Network.replayRequest(request);
                    return;
                }

                // There are some API requests that should not be retried when there is an auth failure like
                // creating and deleting logins. In those cases, they should handle the original response instead
                // of the new response created by handleExpiredAuthToken.
                const shouldRetry = lodashGet(request, 'data.shouldRetry');
                if (!shouldRetry) {
                    if (isFromSequentialQueue) {
                        return data;
                    }

                    request.resolve(data);
                    return;
                }

                // We are already authenticating
                if (NetworkStore.getIsAuthenticating()) {
                    if (isFromSequentialQueue) {
                        // The only way this can happen is if we are already authenticating via the main queue while the sequential queue is running.
                        // Main queue requests should be blocked until the sequential queue finishes so it's unlikely that one would be happening.
                        throw new Error('Unable to authenticate sequential queue request because we are already authenticating');
                    }

                    Network.replayRequest(request);
                    return data;
                }

                return Authentication.reauthenticate(request.commandName)
                    .then((authenticateResponse) => {
                        if (isFromSequentialQueue) {
                            return Request.process(request, true);
                        }

                        Network.replayRequest(request);
                        return authenticateResponse;
                    })
                    .catch(() => {
                        if (isFromSequentialQueue) {
                            throw new Error('Unable to reauthenticate sequential queue request because we failed to reauthenticate');
                        }

                        Network.replayRequest(request);
                    });
            }

            if (isFromSequentialQueue) {
                PersistedRequests.remove(request);
                return data;
            }

            request.resolve(data);
        });
}
