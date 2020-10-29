/**
 * The react native image/document pickers work for iOS/Android, but we want to wrap them both within AttachmentPicker
 */
import RNImagePicker from 'react-native-image-picker';
import RNDocumentPicker from 'react-native-document-picker';
import PropTypes from 'prop-types';

/**
 * See https://github.com/react-native-community/react-native-image-picker/blob/master/docs/Reference.md#options
 * for ImagePicker configuration options
 */
const imagePickerOptions = {
    title: 'Select an Attachment',
    takePhotoButtonTitle: 'Take Photo',
    chooseFromLibraryButtonTitle: 'Choose from Gallery',
    customButtons: [{name: 'Document', title: 'Choose Document'}],
    storageOptions: {
        skipBackup: true,
    },
};

/**
 * See https://github.com/rnmods/react-native-document-picker#options for DocumentPicker configuration options
 */
const documentPickerOptions = {
    type: [RNDocumentPicker.types.allFiles],
};

/**
 * Launch the DocumentPicker. Results are in same format as ImagePicker, so we can pass the repsonse to the
 * callback as is.
 *
 * @param {Object} callback
 */
function showDocumentPicker(callback) {
    RNDocumentPicker.pick(documentPickerOptions).then((results) => {
        callback(results);
    }).catch((error) => {
        if (!RNDocumentPicker.isCancel(error)) {
            throw error;
        }
    });
}

/**
 * Launch the AttachmentPicker. We display the ImagePicker first, as the document option is displayed as a
 * custom ImagePicker list item.
 *
 * @param {Object} callback
 */
function show(callback) {
    RNImagePicker.showImagePicker(imagePickerOptions, (response) => {
        if (response.error) {
            console.error(`Error during attachment selection: ${response.error}`);
        } else if (response.customButton) {
            this.showDocumentPicker(callback);
        } else if (!response.didCancel) {
            callback(response);
        }
    });
}

/**
 * The data returned from `show` is different on web and mobile, so use this function to ensure the data we
 * send to the xhr will be handled properly.
 *
 * @param {Object} fileData
 *
 * @return {Object}
 */
function getDataForUpload(fileData) {
    return {
        name: fileData.fileName || 'chat_attachment',
        type: fileData.type,
        uri: fileData.uri,
    };
}

const propTypes = {
    children: PropTypes.func.isRequired,
};

/**
 * This component renders a function as a child and
 * returns a "show attachment picker" method that takes
 * a callback. This is the web/mWeb/desktop version since
 * on iOS Safari we must append a hidden input to the DOM
 * and listen to onChange event. When the show method is
 * called an attachment
 *
 * @example
 * <AttachmentPicker>
 * {({openFilePicker}) => (
 *     <Button
 *         onPress={() => {
 *             openFilePicker({
 *                 onFilePicked: (file) => {
 *                     // Display or upload File
 *                 },
 *             });
 *         }}
 *     />
 * )}
 * </AttachmentPicker>
 *
 * @returns {Function}
 */
const AttachmentPicker = ({children}) => children({
    openFilePicker: ({onFilePicked}) => {
        show((response) => {
            onFilePicked(getDataForUpload(response));
        });
    },
});

AttachmentPicker.propTypes = propTypes;
AttachmentPicker.displayName = 'AttachmentPicker';
export default AttachmentPicker;
