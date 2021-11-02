import React from 'react';
import PropTypes from 'prop-types';
import {View, TouchableWithoutFeedback} from 'react-native';
import PDF from 'react-native-pdf';
import styles, {getWidthAndHeightStyle} from '../../styles/styles';
import withWindowDimensions, {windowDimensionsPropTypes} from '../withWindowDimensions';
import FullScreenLoadingIndicator from '../FullscreenLoadingIndicator';

const propTypes = {
    /** URL to full-sized image */
    sourceURL: PropTypes.string,

    /** Any additional styles to apply */
    // eslint-disable-next-line react/forbid-prop-types
    style: PropTypes.any,

    ...windowDimensionsPropTypes,
};

const defaultProps = {
    sourceURL: '',
    style: {},
};

/**
 * On the native layer, we use a pdf library to display PDFs
 *
 * @param props
 * @returns {JSX.Element}
 */

const PDFView = props => (
    <View style={[styles.flex1, props.style]}>
        <TouchableWithoutFeedback>
            <PDF
                activityIndicator={<FullScreenLoadingIndicator />}
                source={{uri: props.sourceURL}}
                style={[
                    styles.imageModalPDF,
                    getWidthAndHeightStyle(props.windowWidth, props.windowHeight),
                ]}
            />
        </TouchableWithoutFeedback>
    </View>
);

PDFView.propTypes = propTypes;
PDFView.defaultProps = defaultProps;
PDFView.displayName = 'PDFView';

export default withWindowDimensions(PDFView);
