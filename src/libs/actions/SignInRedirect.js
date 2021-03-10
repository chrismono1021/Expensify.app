import Onyx from 'react-native-onyx';
import ONYXKEYS from '../../ONYXKEYS';
import ROUTES from '../../ROUTES';
import {redirect} from './App';
import * as Pusher from '../Pusher/pusher';
import NetworkConnection from '../NetworkConnection';
import UnreadIndicatorUpdater from '../UnreadIndicatorUpdater';
import PushNotification from '../Notification/PushNotification';

let currentURL;
Onyx.connect({
    key: ONYXKEYS.CURRENT_URL,
    callback: val => currentURL = val,
});

/**
 * Clears the Onyx store and redirects to the sign in page.
 * Normally this method would live in Session.js, but that would cause a circular dependency with Network.js.
 *
 * @param {String} [errorMessage] error message to be displayed on the sign in page
 */
function redirectToSignIn(errorMessage) {
    NetworkConnection.stopListeningForReconnect();
    UnreadIndicatorUpdater.stopListeningForReportChanges();
    PushNotification.deregister();
    Pusher.disconnect();

    if (!currentURL) {
        return;
    }

    // If we are already on the signin page, don't redirect
    if (currentURL.indexOf('signin') !== -1) {
        return;
    }

    // We must set the authToken to null so we can navigate to "signin" it's not possible to navigate to the route as
    // it only exists when the authToken is null.
    Onyx.set(ONYXKEYS.SESSION, {authToken: null})
        .then(() => {
            Onyx.clear().then(() => {
                if (errorMessage) {
                    Onyx.set(ONYXKEYS.SESSION, {error: errorMessage});
                }
            });
        });
}

export default redirectToSignIn;
