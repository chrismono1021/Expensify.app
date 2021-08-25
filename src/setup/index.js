import Onyx from 'react-native-onyx';
import ONYXKEYS from '../ONYXKEYS';
import CONST from '../CONST';
import listenToStorageEvents from '../libs/listenToStorageEvents';
import Log from '../libs/Log';
import platformSetup from './platformSetup';
import {canCaptureOnyxMetrics} from '../libs/canCaptureMetrics';

export default function () {
    // Initialize the Onyx store when the app loads for the first time
    Onyx.init({
        keys: ONYXKEYS,
        safeEvictionKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS],
        captureMetrics: canCaptureOnyxMetrics(),
        initialKeyStates: {

            // Clear any loading and error messages so they do not appear on app startup
            [ONYXKEYS.SESSION]: {loading: false, shouldShowComposeInput: true},
            [ONYXKEYS.ACCOUNT]: CONST.DEFAULT_ACCOUNT_DATA,
            [ONYXKEYS.NETWORK]: {isOffline: false},
            [ONYXKEYS.IOU]: {
                loading: false, error: false, creatingIOUTransaction: false, isRetrievingCurrency: false,
            },
            [ONYXKEYS.IS_SIDEBAR_LOADED]: false,
        },
        registerStorageEventListener: (onStorageEvent) => {
            listenToStorageEvents(onStorageEvent);
        },
    });

    Onyx.registerLogger(({level, message}) => {
        if (level === 'alert') {
            Log.alert(message, 0, {}, false);
        } else {
            Log.client(message);
        }
    });

    // Perform any other platform-specific setup
    platformSetup();
}
