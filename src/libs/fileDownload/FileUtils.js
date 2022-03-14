import {Alert, Linking} from 'react-native';
import moment from 'moment';
import * as mime from 'react-native-mime-types';
import CONST from '../../CONST';
import * as Localize from '../Localize';

/**
 * Show alert on successful attachment download
 */
function showSuccessAlert() {
    Alert.alert(
        Localize.translateLocal('fileDownload.success.title'),
        Localize.translateLocal('fileDownload.success.message'),
        [
            {
                text: Localize.translateLocal('fileDownload.success.buttons.ok.text'),
                style: 'cancel',
            },
        ],
        {cancelable: false},
    );
}

/**
 * Show alert on attachment download error
 */
function showGeneralErrorAlert() {
    Alert.alert(
        Localize.translateLocal('fileDownload.generalError.title'),
        Localize.translateLocal('fileDownload.generalError.message'),
        [
            {
                text: Localize.translateLocal('fileDownload.generalError.buttons.cancel.text'),
                style: 'cancel',
            },
        ],
    );
}

/**
 * Show alert on attachment download permissions error
 */
function showPermissionErrorAlert() {
    Alert.alert(
        Localize.translateLocal('fileDownload.permissionError.title'),
        Localize.translateLocal('fileDownload.permissionError.message'),
        [
            {
                text: Localize.translateLocal('fileDownload.permissionError.buttons.cancel.text'),
                style: 'cancel',
            },
            {
                text: Localize.translateLocal('fileDownload.permissionError.buttons.settings.text'),
                onPress: () => Linking.openSettings(),
            },
        ],
    );
}

/**
 * Generating a random file name with timestamp and file extention
 * @param {String} url
 * @returns {String}
 */
function getAttachmentName(url) {
    if (!url) {
        return '';
    }
    return `${moment().format('DDMMYYYYHHmmss')}.${url.split(/[#?]/)[0].split('.').pop().trim()}`;
}

/**
 * Returns file type based on the uri
 * @param {String} fileUri
 * @returns {String}
 */

function getFileType(fileUrl) {
    if (!fileUrl) {
        return;
    }
    const fileName = fileUrl.split('/').pop().split('?')[0].split('#')[0];
    const contentType = mime.contentType(fileName);
    if (contentType.startsWith('image')) {
        return CONST.ATTACHMENT_FILE_TYPE.IMAGE;
    }
    if (contentType.startsWith('video')) {
        return CONST.ATTACHMENT_FILE_TYPE.VIDEO;
    }
    return CONST.ATTACHMENT_FILE_TYPE.FILE;
}

export {
    showGeneralErrorAlert,
    showSuccessAlert,
    showPermissionErrorAlert,
    getAttachmentName,
    getFileType,
};
