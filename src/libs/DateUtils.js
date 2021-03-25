import moment from 'moment';
import 'moment-timezone';
import Onyx from 'react-native-onyx';
import ONYXKEYS from '../ONYXKEYS';
import CONST from '../CONST';

let timezone;
Onyx.connect({
    key: ONYXKEYS.MY_PERSONAL_DETAILS,
    callback: (val) => { timezone = val ? val.timezone.selected : CONST.DEFAULT_TIME_ZONE.selected; },
});

/**
 * Gets the user's stored time-zone NVP and returns a localized
 * Moment object for the given timestamp
 *
 * @param {String} locale
 * @param {Number} timestamp
 *
 * @returns  {Moment}
 *
 * @private
 */
function getLocalMomentFromTimestamp(locale, timestamp) {
    moment.locale(locale);
    return moment.unix(timestamp).tz(timezone);
}

/**
 * Formats a timestamp to local date and time string
 *
 * e.g.
 *
 * Jan 20 at 5:30 PM          within the past year
 * Jan 20, 2019 at 5:30 PM    anything over 1 year ago
 *
 * @param {String} locale
 * @param {Number} timestamp
 * @param {Boolean} includeTimeZone
 *
 * @returns {String}
 */
function timestampToDateTime(locale, timestamp, includeTimeZone = false) {
    const date = getLocalMomentFromTimestamp(locale, timestamp);
    const TZ = '[UTC]Z';

    moment.calendarFormat = function (myMoment, now) {
        const diff = myMoment.diff(now, 'days', true);

        let retVal = 'sameElse';

        if (diff < -1) {
            retVal = 'lastWeek';
        } else if (diff < 0) {
            retVal = 'lastDay';
        } else if (diff < 1) {
            retVal = 'sameDay';
        } else if (diff < 2) {
            retVal = 'nextDay';
        } else if (diff < 7) {
            retVal = 'nextWeek';
        }

        return retVal;
    };

    if (includeTimeZone) {
        return moment(date).calendar({
            sameDay: `[Today at] LT ${TZ}`,
            nextDay: `[Tomorrow at] LT ${TZ}`,
            nextWeek: `MMM D [at] LT ${TZ}`,
            lastDay: `[Yesterday at] LT ${TZ}`,
            lastWeek: `MMM D [at] LT ${TZ}`,
            sameElse: `MMM D, YYYY [at] LT ${TZ}`,
        });
    }

    return moment(date).calendar({
        sameDay: '[Today at] LT',
        nextDay: '[Tomorrow at] LT',
        nextWeek: 'MMM D [at] LT',
        lastDay: '[Yesterday at] LT',
        lastWeek: 'MMM D [at] LT',
        sameElse: 'MMM D, YYYY [at] LT',
    });
}

/**
 * Converts a timestamp into a localized string representation
 * that's relative to current moment in time.
 *
 * e.g.
 *
 * < 1 minute ago       within the past minute
 * 12 minutes ago       within the past hour
 * 1 hour ago           within the past day
 * 3 days ago           within the past month
 * Jan 20               within the past year
 * Jan 20, 2019         anything over 1 year
 *
 * @param {String} locale
 * @param {Number} timestamp
 *
 * @returns {String}
 */
function timestampToRelative(locale, timestamp) {
    const date = getLocalMomentFromTimestamp(locale, timestamp);

    return moment(date).fromNow();
}

/**
 * @namespace DateUtils
 */
const DateUtils = {
    timestampToRelative,
    timestampToDateTime,
};

export default DateUtils;
