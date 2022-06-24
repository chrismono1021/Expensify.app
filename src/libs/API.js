import _ from 'underscore';
import Onyx from 'react-native-onyx';
import * as Request from './Request';
import * as SequentialQueue from './Network/SequentialQueue';
import {version} from '../../package.json';

/**
 * API.write() is for WRITE commands. It will not return a promise or any value to the caller.
 * All calls to API.write() will be persisted to disk as a JSON object.
 * That object will have all the data needed to make the WRITE request later. In other words, we'll queue the WRITE
 * request so that if the network is unavailable or the app is closed, we can send the WRITE request whenever the
 * network comes back.
 *
 * @param {String} command - Name of API command to call
 * @param {Object} apiCommandParameters - The object of parameters to send to the API
 * @param {Object} onyxData  - Object containing errors, loading states, and optimistic UI data
 * @param {Object} [onyxData.optimisticData] - An object of data that will be merged into Onyx before the request is made
 * @param {Object} [onyxData.successData] - An object of data that will be merged into Onyx when the request succeeds.
 * @param {Object} [onyxData.failureData] - An object of data that will be merged into Onyx when the request fails.
 */
function write(command, apiCommandParameters = {}, onyxData = {}) {
    // Optimistically update Onyx
    if (onyxData.optimisticData) {
        Onyx.update(onyxData.optimisticData);
    }

    // Assemble the data we'll send to the API
    const data = {
        ...apiCommandParameters,
        appversion: version,
    };

    // Assemble all the request data we'll be storing in the queue
    const request = {
        command,
        data: {
            ...data,

            // This should be removed once we are no longer using deprecatedAPI https://github.com/Expensify/Expensify/issues/215650
            shouldRetry: true,
            canCancel: true,
        },
        ..._.omit(onyxData, 'optimisticData'),
    };

    // Write commands can be saved and retried, so push it to the SequentialQueue
    SequentialQueue.push(request);
}

function makeRequestWithSideEffects(command, apiCommandParameters = {}, onyxData = {}) {
    // Optimistically update Onyx
    if (onyxData.optimisticData) {
        Onyx.update(onyxData.optimisticData);
    }

    // Assemble the data we'll send to the API
    const data = {
        ...apiCommandParameters,
        appversion: version,
    };

    // Assemble all the request data we'll be storing
    const request = {
        command,
        data,
        ..._.omit(onyxData, 'optimisticData'),
    };

    // Return a promise containing the response from HTTPS
    return Request.processWithMiddleware(request);
}

function read(command, apiCommandParameters, onyxData) {
    makeRequestWithSideEffects(command, apiCommandParameters, onyxData);
}

export {
    write,
    makeRequestWithSideEffects,
    read,
};
