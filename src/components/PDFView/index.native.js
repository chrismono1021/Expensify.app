import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {TouchableWithoutFeedback, View} from 'react-native';
import PDF from 'react-native-pdf';
import styles from '../../styles/styles';
import * as StyleUtils from '../../styles/StyleUtils';
import withWindowDimensions, {windowDimensionsPropTypes} from '../withWindowDimensions';
import FullScreenLoadingIndicator from '../FullscreenLoadingIndicator';
import PDFPasswordForm from './PDFPasswordForm';

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
 * On the native layer, we use a pdf library to display PDFs. If a PDF is
 * password-protected we render a PDFPasswordForm to request a password
 * from the user.
 *
 * In order to render things nicely during a password challenge we need
 * to keep track of a bunch of additional state. In particular, the
 * react-native-pdf/PDF component is both conditionally rendered and hidden
 * depending upon the situation. It needs to be rerendered on each password
 * submission because it doesn't dynamically handle updates to it's
 * password property. And we need to hide it during password challenges
 * so that PDFPasswordForm doesn't bounce when react-native-pdf/PDF
 * is (temporarily) rendered.
 */
class PDFView extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            shouldRequestPassword: false,
            isPasswordInvalid: false,
            password: '',
            shouldAttemptPdfLoad: true,
            isPdfLoaded: false,
        };
        this.onError = this.onError.bind(this);
        this.onPasswordFormSubmit = this.onPasswordFormSubmit.bind(this);
        this.onLoadComplete = this.onLoadComplete.bind(this);
    }

    /**
     * The react-native-pdf/PDF calls this handler when a password is required,
     * or if the specified password is invalid.
     *
     * The message is "Password required or incorrect password." Note that the message
     * doesn't specify whether the password is simply empty or rather invalid.
     *
     * @param {Object} error
     */
    onError(error) {
        if (!error.message.match(/password/i)) {
            return;
        }

        // Render password form, and don't render PDF.
        this.setState({shouldRequestPassword: true, shouldAttemptPdfLoad: false});

        // The error message provided by react-native-pdf doesn't indicate whether this
        // is an initial password request or if the password is invalid. So we just assume
        // that if a password was already entered then it's an invalid password error.
        if (this.state.password) {
            this.setState({isPasswordInvalid: true});
        }
    }

    /**
     * When the password is submitted via PDFPasswordForm, save the password
     * in state and attempt to load the PDF.
     *
     * @param {String} password Password submitted via PDFPasswordForm
     */
    onPasswordFormSubmit(password) {
        // Render PDF in invisible state. It's invisible because at this
        // stage of the password challenge process isPdfLoaded is false.
        this.setState({password, shouldAttemptPdfLoad: true});
    }

    /**
     * When the PDF is loaded, hide PDFPasswordForm and make PDF component
     * visible.
     */
    onLoadComplete() {
        // Don't render PDFPasswordForm, and do render PDF in visible state.
        this.setState({shouldRequestPassword: false, isPdfLoaded: true});
    }

    render() {
        const pdfStyles = [
            styles.imageModalPDF,
            StyleUtils.getWidthAndHeightStyle(this.props.windowWidth, this.props.windowHeight),
        ];

        // If we haven't yet successfully loaded the PDF then we need to hide the
        // react-native-pdf/PDF component so that PDFPasswordForm is positioned
        // nicely. We're just hiding it because we still need to render the PDF so
        // that it can validate the password.
        if (!this.state.isPdfLoaded) {
            pdfStyles.push(styles.invisible);
        }

        return (
            <TouchableWithoutFeedback style={[styles.flex1, this.props.style]}>

                <View>

                    {this.state.shouldAttemptPdfLoad && (
                        <PDF
                            activityIndicator={<FullScreenLoadingIndicator />}
                            source={{uri: this.props.sourceURL}}
                            style={pdfStyles}
                            onError={error => this.onError(error)}
                            password={this.state.password}
                            onLoadComplete={this.onLoadComplete}
                        />
                    )}

                    {this.state.shouldRequestPassword && (
                        <PDFPasswordForm
                            onSubmit={this.onPasswordFormSubmit}
                            isPasswordInvalid={this.state.isPasswordInvalid}
                        />
                    )}

                </View>
            </TouchableWithoutFeedback>
        );
    }
}

PDFView.propTypes = propTypes;
PDFView.defaultProps = defaultProps;
PDFView.displayName = 'PDFView';

export default withWindowDimensions(PDFView);
