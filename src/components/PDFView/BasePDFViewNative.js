import React, {Component} from 'react';
import PDF from 'react-native-pdf';
import {TouchableWithoutFeedback, View} from 'react-native';
import PropTypes from 'prop-types';
import styles from '../../styles/styles';
import * as StyleUtils from '../../styles/StyleUtils';
import FullScreenLoadingIndicator from '../FullscreenLoadingIndicator';
import PDFPasswordForm from './PDFPasswordForm';
import {propTypes as pdfViewPropTypes, defaultProps as pdfViewDefaultProps} from './pdfViewPropTypes';
import withWindowDimensions from '../withWindowDimensions';

const propTypes = {
    ...pdfViewPropTypes,

    /** Notify parent that a PDF load attempt is in progress */
    onAttemptPdfLoad: PropTypes.func,
};

const defaultProps = {
    ...pdfViewDefaultProps,
    onAttemptPdfLoad: () => {},
};

/**
 * On the native layer, we use react-native-pdf/PDF to display PDFs. If a PDF is
 * password-protected we render a PDFPasswordForm to request a password
 * from the user.
 *
 * In order to render things nicely during a password challenge we need
 * to keep track of additional state. In particular, the
 * react-native-pdf/PDF component is both conditionally rendered and hidden
 * depending upon the situation. It needs to be rerendered on each password
 * submission because it doesn't dynamically handle updates to its
 * password property. And we need to hide it during password challenges
 * so that PDFPasswordForm doesn't bounce when react-native-pdf/PDF
 * is (temporarily) rendered.
 */
class BasePDFViewNative extends Component {
    constructor(props) {
        super(props);
        this.state = {
            shouldRequestPassword: false,
            shouldAttemptPdfLoad: true,
            shouldShowLoadingIndicator: true,
            isPasswordInvalid: false,
            password: '',
        };
        this.initiatePasswordChallenge = this.initiatePasswordChallenge.bind(this);
        this.attemptPdfLoadWithPassword = this.attemptPdfLoadWithPassword.bind(this);
        this.finishPdfLoad = this.finishPdfLoad.bind(this);
    }

    /**
     * Initiate password challenge if message received from react-native-pdf/PDF
     * indicates that a password is required or invalid.
     *
     * For a password challenge the message is "Password required or incorrect password."
     * Note that the message doesn't specify whether the password is simply empty or
     * invalid.
     *
     * @param {String} message
     */
    initiatePasswordChallenge({message}) {
        this.setState({shouldShowLoadingIndicator: false});

        if (!message.match(/password/i)) {
            return;
        }

        // Render password form, and don't render PDF and loading indicator.
        this.setState({
            shouldRequestPassword: true,
            shouldAttemptPdfLoad: false,
        });

        // The message provided by react-native-pdf doesn't indicate whether this
        // is an initial password request or if the password is invalid. So we just assume
        // that if a password was already entered then it's an invalid password error.
        if (this.state.password) {
            this.setState({isPasswordInvalid: true});
        }
    }

    /**
     * When the password is submitted via PDFPasswordForm, save the password
     * in state and attempt to load the PDF. Also show the loading indicator
     * since react-native-pdf/PDF will need to reload the PDF.
     *
     * @param {String} password Password submitted via PDFPasswordForm
     */
    attemptPdfLoadWithPassword(password) {
        this.props.onAttemptPdfLoad();

        // Render react-native-pdf/PDF so that it can validate the password.
        // Note that at this point in the password challenge, shouldRequestPassword is true.
        // Thus react-native-pdf/PDF will be rendered - but not visible.
        this.setState({
            password,
            shouldAttemptPdfLoad: true,
            shouldShowLoadingIndicator: true,
            isPasswordInvalid: false,
        });
    }

    /**
     * After the PDF is successfully loaded hide PDFPasswordForm and the loading
     * indicator.
     */
    finishPdfLoad() {
        this.setState({
            shouldRequestPassword: false,
            shouldShowLoadingIndicator: false,
        });
    }

    render() {
        const pdfStyles = [
            styles.imageModalPDF,
            StyleUtils.getWidthAndHeightStyle(this.props.windowWidth, this.props.windowHeight),
        ];
        const touchableStyles = [
            styles.flex1,
            this.props.style,
        ];

        // If we haven't yet successfully validated the password and loaded the PDF,
        // then we need to hide the react-native-pdf/PDF component so that PDFPasswordForm
        // is positioned nicely. We're specifically hiding it because we still need to render
        // the PDF so that it can validate the password.
        if (this.state.shouldRequestPassword) {
            pdfStyles.push(styles.invisible);
        }

        // For small screens force the container view to take up the full width when
        // displaying the password form.
        const containerStyles = this.state.shouldRequestPassword && this.props.isSmallScreenWidth
            ? styles.pdfPasswordForm.nativeNarrowContainer : {};

        return (
            <View style={containerStyles}>
                {this.state.shouldAttemptPdfLoad && (
                    <TouchableWithoutFeedback style={touchableStyles}>
                        <PDF
                            activityIndicator={<FullScreenLoadingIndicator />}
                            source={{uri: this.props.sourceURL}}
                            style={pdfStyles}
                            onError={this.initiatePasswordChallenge}
                            password={this.state.password}
                            onLoadComplete={this.finishPdfLoad}
                        />
                    </TouchableWithoutFeedback>
                )}
                {this.state.shouldRequestPassword && (
                    <PDFPasswordForm
                        onSubmit={this.attemptPdfLoadWithPassword}
                        onPasswordUpdated={() => this.setState({isPasswordInvalid: false})}
                        isPasswordInvalid={this.state.isPasswordInvalid}
                        shouldShowLoadingIndicator={this.state.shouldShowLoadingIndicator}
                        onAvoidKeyboard={this.props.onAvoidKeyboard}
                    />
                )}
            </View>
        );
    }
}

BasePDFViewNative.propTypes = propTypes;
BasePDFViewNative.defaultProps = defaultProps;

export default withWindowDimensions(BasePDFViewNative);
