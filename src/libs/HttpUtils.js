import Onyx from 'react-native-onyx';
import _ from 'underscore';
import CONFIG from '../CONFIG';
import CONST from '../CONST';
import ONYXKEYS from '../ONYXKEYS';

let shouldUseSecureStaging = false;
Onyx.connect({
    key: ONYXKEYS.USER,
    callback: val => shouldUseSecureStaging = (val && _.isBoolean(val.shouldUseSecureStaging)) ? val.shouldUseSecureStaging : false,
});

let abortController = new AbortController();

/**
 * Send an HTTP request, and attempt to resolve the json response.
 * If there is a network error, we'll set the application offline.
 *
 * @param {String} url
 * @param {String} [method='get']
 * @param {Object} [body=null]
 * @param {Boolean} [canAbort=true]
 * @returns {Promise}
 */
function processHTTPRequest(url, method = 'get', body = null, canAbort = true) {
    return fetch(url, {
        // We hook requests to the same signal, so we can abort them all (controller ignores completed requests)
        signal: canAbort ? abortController.signal : undefined,
        method,
        body,
    })
        .then(response => response.json());
}

/**
 * Makes XHR request
 * @param {String} command the name of the API command
 * @param {Object} data parameters for the API command
 * @param {String} type HTTP request type (get/post)
 * @param {Boolean} shouldUseSecure should we use the secure server
 * @returns {Promise}
 */
function xhr(command, data, type = CONST.NETWORK.METHOD.POST, shouldUseSecure = false) {
    const formData = new FormData();
    _.each(data, (val, key) => formData.append(key, val));
    let apiRoot = shouldUseSecure ? CONFIG.EXPENSIFY.URL_EXPENSIFY_SECURE : CONFIG.EXPENSIFY.URL_API_ROOT;

    if (shouldUseSecure && shouldUseSecureStaging) {
        apiRoot = CONST.STAGING_SECURE_URL;
    }

    return processHTTPRequest(`${apiRoot}api?command=${command}`, type, formData, data.canAbort);
}

/**
 * Just download a file from the web server.
 *
 * @param {String} relativePath From the website root, NOT the API root. (no leading slash, ., or ..)
 * @returns {Promise}
 */
function download(relativePath) {
    const siteRoot = CONFIG.EXPENSIFY.URL_EXPENSIFY_CASH;

    // Strip leading slashes and periods from relative path, if present
    const strippedRelativePath = relativePath.charAt(0) === '/' || relativePath.charAt(0) === '.'
        ? relativePath.slice(relativePath.indexOf('/') + 1)
        : relativePath;

    return processHTTPRequest(`${siteRoot}${strippedRelativePath}`);
}

function abortPendingRequests() {
    abortController.abort();
    abortController = new AbortController();
}

export default {
    download,
    xhr,
    abortPendingRequests,
};
