import {PermissionsAndroid} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import * as FileUtils from './FileUtils';

/**
 * Android permission check to store images
 * @returns {Promise<Boolean>}
 */
function hasAndroidPermission() {
    // read and write permission
    const writePromise = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    const readPromise = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);

    return Promise.all([writePromise, readPromise]).then(([hasWritePermission, hasReadPermission]) => {
        if (hasWritePermission && hasReadPermission) {
            return true; // return true if permission is already given
        }

        // ask for permission if not given
        return PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]).then(status => status['android.permission.READ_EXTERNAL_STORAGE'] === 'granted'
                    && status['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted');
    });
}

/**
 * Handling the download
 * @param {String} url
 * @param {String} fileName
 * @returns {Promise<Void>}
 */
function handleDownload(url, fileName) {
    return new Promise((resolve) => {
        const dirs = RNFetchBlob.fs.dirs;

        // android files will download to Download directory
        const path = dirs.DownloadDir;
        const attachmentName = fileName || FileUtils.getAttachmentName(url);

        // fetching the attachment
        const fetchedAttachment = RNFetchBlob.config({
            fileCache: true,
            path: `${path}/${attachmentName}`,
            addAndroidDownloads: {
                useDownloadManager: true,
                notification: true,
                path: `${path}/Expensify/${attachmentName}`,
            },
        }).fetch('GET', url);

        // resolving the fetched attachment
        fetchedAttachment.then((attachment) => {
            if (!attachment || !attachment.info()) {
                return;
            }

            FileUtils.showSuccessAlert();
        }).catch(() => {
            FileUtils.showGeneralErrorAlert();
        }).finally(() => resolve());
    });
}

/**
 * Checks permission and downloads the file for Android
 * @param {String} url
 * @param {String} fileName
 * @returns {Promise}
 */
export default function fileDownload(url, fileName) {
    return new Promise((resolve) => {
        hasAndroidPermission().then((hasPermission) => {
            if (hasPermission) {
                return handleDownload(url, fileName);
            }
            FileUtils.showPermissionErrorAlert();
        }).catch(() => {
            FileUtils.showPermissionErrorAlert();
        }).finally(() => resolve());
    });
}
