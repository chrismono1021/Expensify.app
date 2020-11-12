import _ from 'underscore';
import lodashGet from 'lodash.get';
import Onyx from 'react-native-onyx';
import * as API from '../API';
import ONYXKEYS from '../../ONYXKEYS';
import md5 from '../md5';
import CONST from '../../CONST';
import NetworkConnection from '../NetworkConnection';

let currentUserEmail;
Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: val => currentUserEmail = val ? val.email : null,
});

let personalDetails;
Onyx.connect({
    key: ONYXKEYS.PERSONAL_DETAILS,
    callback: val => personalDetails = val,
});

/**
 * Returns the URL for a user's avatar and handles someone not having any avatar at all
 *
 * @param {object} personalDetail
 * @param {string} login
 * @returns {string}
 */
function getAvatar(personalDetail, login) {
    if (personalDetail && personalDetail.avatar) {
        return personalDetail.avatar.replace(/&d=404$/, '');
    }

    // There are 8 possible default avatars, so we choose which one this user has based
    // on a simple hash of their login (which is converted from HEX to INT)
    const loginHashBucket = (parseInt(md5(login).substring(0, 4), 16) % 8) + 1;
    return `${CONST.CLOUDFRONT_URL}/images/avatars/avatar_${loginHashBucket}.png`;
}

/**
 * Returns the displayName for a user
 *
 * @param {string} login
 * @param {object} [personalDetail]
 * @returns {string}
 */
function getDisplayName(login, personalDetail) {
    const userDetails = personalDetail || personalDetails[login];

    if (!userDetails) {
        return login;
    }

    if (userDetails.displayName) {
        return userDetails.displayName;
    }

    const firstName = userDetails.firstName || '';
    const lastName = userDetails.lastName || '';

    return (`${firstName} ${lastName}`).trim() || login;
}

/**
 * Format personal details
 *
 * @param {Object} personalDetailsList
 * @return {Object}
 */
function formatPersonalDetails(personalDetailsList) {
    return _.reduce(personalDetailsList, (finalObject, personalDetailsResponse, login) => {
        // Form the details into something that has all the data in an easy to use format.
        const avatarURL = getAvatar(personalDetailsResponse, login);
        const displayName = getDisplayName(login, personalDetailsResponse);
        return {
            ...finalObject,
            [login]: {
                login,
                avatarURL,
                displayName,
            }
        };
    }, {});
}

/**
 * Get the timezone of the logged in user
 */
function fetchTimezone() {
    API.get({
        returnValueList: 'nameValuePairs',
        name: 'timeZone',
    })
        .then((data) => {
            const timezone = lodashGet(data, 'nameValuePairs.timeZone.selected', 'America/Los_Angeles');
            Onyx.merge(ONYXKEYS.MY_PERSONAL_DETAILS, {timezone});
        });

    // Refresh the timezone every 30 minutes
    setTimeout(fetchTimezone, 1000 * 60 * 30);
}

/**
 * Get the personal details for our organization
 */
function fetch() {
    API.get({
        returnValueList: 'personalDetailsList',
    })
        .then((data) => {
            const allPersonalDetails = formatPersonalDetails(data.personalDetailsList);
            Onyx.merge(ONYXKEYS.PERSONAL_DETAILS, allPersonalDetails);

            const myPersonalDetails = allPersonalDetails[currentUserEmail]
                || {avatarURL: getAvatar(undefined, currentUserEmail)};

            // Set my personal details so they can be easily accessed and subscribed to on their own key
            Onyx.merge(ONYXKEYS.MY_PERSONAL_DETAILS, myPersonalDetails);

            // Get the timezone and put it in Onyx
            fetchTimezone();
        })
        .catch(error => console.error('Error fetching personal details', error));

    // Refresh the personal details every 30 minutes because there is no
    // pusher event that sends updated personal details data yet
    // See https://github.com/Expensify/ReactNativeChat/issues/468
    setTimeout(fetch, 1000 * 60 * 30);
}

/**
 * Get personal details for a list of emails.
 *
 * @param {String} emailList
 * @param {Object} reports
 */
function getForEmails(emailList, reports) {
    API.getPersonalDetails(emailList)
        .then((data) => {
            const details = _.pick(data, emailList.split(','));
            Onyx.merge(ONYXKEYS.PERSONAL_DETAILS, formatPersonalDetails(details));

            // The personalDetails of the participants contain their avatar images. Here we'll go over each
            // report and based on the participants we'll link up their avatars to report icons.
            _.each(reports, (report) => {
                if (report.participants.length === 1) {
                    const dmParticipant = report.participants[0];
                    const icon = lodashGet(details, [dmParticipant, 'avatar']);
                    if (icon) {
                        Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${report.reportID}`, {icon});
                    }
                }
            });
        });
}

// When the app reconnects from being offline, fetch all of the personal details
NetworkConnection.onReconnect(fetch);

export {
    fetch,
    fetchTimezone,
    getForEmails,
    getDisplayName,
    formatPersonalDetails,
};
