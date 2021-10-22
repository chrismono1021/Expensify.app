const {PERMISSIONS} = require('react-native-permissions/dist/commonjs/permissions');
const {RESULTS} = require('react-native-permissions/dist/commonjs/results');
const _ = require('underscore');

export {PERMISSIONS, RESULTS};

export const openLimitedPhotoLibraryPicker = jest.fn((() => {}));
export const openSettings = jest.fn(() => {});
export const check = jest.fn(() => RESULTS.GRANTED);
export const request = jest.fn(() => RESULTS.GRANTED);
export const checkLocationAccuracy = jest.fn(() => 'full');
export const requestLocationAccuracy = jest.fn(() => 'full');

const notificationOptions = ['alert', 'badge', 'sound', 'carPlay', 'criticalAlert', 'provisional'];

const notificationSettings = {
    alert: true,
    badge: true,
    sound: true,
    carPlay: true,
    criticalAlert: true,
    provisional: true,
    lockScreen: true,
    notificationCenter: true,
};

export const checkNotifications = jest.fn(() => ({
    status: RESULTS.GRANTED,
    settings: notificationSettings,
}));

export const requestNotifications = jest.fn(options => ({
    status: RESULTS.GRANTED,
    settings: _.chain(options)
        .filter(option => _.contains(notificationOptions, option))
        .reduce((acc, option) => ({...acc, [option]: true}), {
            lockScreen: true,
            notificationCenter: true,
        })
        .value(),
}));

export const checkMultiple = jest.fn(permissions => _.reduce(permissions, (acc, permission) => ({
    ...acc,
    [permission]: RESULTS.GRANTED,
})));

export const requestMultiple = jest.fn(permissions => _.reduce(permissions, (acc, permission) => ({
    ...acc,
    [permission]: RESULTS.GRANTED,
})));

export default {
    PERMISSIONS,
    RESULTS,

    check,
    checkLocationAccuracy,
    checkMultiple,
    checkNotifications,
    openLimitedPhotoLibraryPicker,
    openSettings,
    request,
    requestLocationAccuracy,
    requestMultiple,
    requestNotifications,
};
