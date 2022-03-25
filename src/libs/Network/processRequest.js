import lodashGet from 'lodash/get';
import CONST from '../../CONST';
import HttpUtils from '../HttpUtils';
import enhanceParameters from './enhanceParameters';
import * as NetworkEvents from './NetworkEvents';
import * as PersistedRequests from '../actions/PersistedRequests';

/**
 * @param {Object} request
 * @param {String} request.command
 * @param {Object} request.data
 * @param {String} request.type
 * @param {Boolean} request.shouldUseSecure
 * @returns {Promise}
 */
export default function processRequest(request) {
    const persisted = lodashGet(request, 'data.persist', false);
    const finalParameters = enhanceParameters(request.command, request.data);
    const cancelRequestTimeoutTimer = NetworkEvents.startRequestTimeoutTimer();
    NetworkEvents.onRequest(request, finalParameters);
    return HttpUtils.xhr(request.command, finalParameters, request.type, request.shouldUseSecure)
        .then((response) => {
            if (persisted) {
                PersistedRequests.remove(request);
            }
            NetworkEvents.onResponse(request, response);
            return response;
        })
        .catch((error) => {
            // Cancelled requests are normal and can happen when a user logs out. No extra handling is needed here besides
            // remove the request from the PersistedRequests if the request exists.
            if (error.name === CONST.ERROR.REQUEST_CANCELLED) {
                NetworkEvents.getLogger().info('[Network] Request canceled', false, request);
                if (persisted) {
                    PersistedRequests.remove(request);
                }
                return;
            }

            // Throw when we get a "Failed to fetch" error so we can retry. Very common if a user is offline or experiencing an unlikely scenario
            // like incorrect url, bad cors headers returned by the server, DNS lookup failure etc.
            if (error.message === CONST.ERROR.FAILED_TO_FETCH) {
                throw error;
            }

            // If we get any error that is not "Failed to fetch" create GitHub issue so we can handle it. These requests will not be retried.
            NetworkEvents.getLogger().alert(`${CONST.ERROR.ENSURE_BUGBOT} unknown error caught while processing request`, {
                command: request.command,
                error: error.message,
            });

            if (persisted) {
                PersistedRequests.remove(request);
            }
        })
        .finally(() => cancelRequestTimeoutTimer());
}
