import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View, Dimensions} from 'react-native';
import {Document, Page} from 'react-pdf/dist/esm/entry.webpack';
import styles from '../../styles/styles';
import withWindowDimensions, {windowDimensionsPropTypes} from '../withWindowDimensions';
import variables from '../../styles/variables';
import FullScreenLoadingIndicator from '../FullscreenLoadingIndicator';
import PDFPasswordForm from './PDFPasswordForm';
import Log from '../../libs/Log';

const propTypes = {
    /** URL to full-sized image */
    sourceURL: PropTypes.string,

    ...windowDimensionsPropTypes,

    /** Any additional styles to apply */
    // eslint-disable-next-line react/forbid-prop-types
    style: PropTypes.any,

    /** Notify parent that we're requesting input from user */
    onUserInputRequired: PropTypes.func,
};

const defaultProps = {
    sourceURL: '',
    style: {},
    onUserInputRequired: () => {},
};

class PDFView extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            numPages: null,
            windowWidth: Dimensions.get('window').width,
            shouldRequestPassword: true,
            isPasswordInvalid: false,
        };
        this.onDocumentLoadSuccess = this.onDocumentLoadSuccess.bind(this);
        this.initiatePasswordChallenge = this.initiatePasswordChallenge.bind(this);
        this.openPdfWithPassword = this.openPdfWithPassword.bind(this);
    }

    /**
     * Upon successful document load, set the number of pages on PDF,
     * hide/reset PDF password form, and notify parent component that
     * user input is no longer required.
     *
     * @param {*} {numPages} No of pages in the rendered PDF
     * @memberof PDFView
     */
    onDocumentLoadSuccess({numPages}) {
        this.setState({
            numPages,
            shouldRequestPassword: false,
            isPasswordInvalid: false,
        });
        this.props.onUserInputRequired(false);
    }

    /**
     * Initiate password challenge process. The react-pdf/Document
     * component calls this handler to indicate that a PDF requires a
     * password, or to indicate that a previously provided password was
     * invalid.
     *
     * The PasswordResponses constants below were copied from react-pdf
     * because they're not exported in entry.webpack.
     *
     * @param {*} callback Callback used to send password to react-pdf
     * @param {Number} reason Reason code for password request
     */
    initiatePasswordChallenge(callback, reason) {
        this.onPasswordCallback = callback;

        const PasswordResponses = {
            NEED_PASSWORD: 1,
            INCORRECT_PASSWORD: 2,
        };

        if (reason === PasswordResponses.NEED_PASSWORD) {
            this.setState({shouldRequestPassword: true});
            this.props.onUserInputRequired(true);
        } else if (reason === PasswordResponses.INCORRECT_PASSWORD) {
            this.setState({shouldRequestPassword: true, isPasswordInvalid: true});
            this.props.onUserInputRequired(true);
        } else {
            Log.warn('[PDFView] pdf password requested for unknown reason: ', reason);
        }
    }

    /**
     * Send submitted password to react-pdf via its callback so it can attempt to
     * open the password-protected PDf.
     *
     * @param {String} password The password entered in the form
     */
    openPdfWithPassword(password) {
        this.onPasswordCallback(password);
    }

    /**
     * Generate markup for PDFPasswordForm. This form is only displayed if a
     * password is required to open a PDF.
     *
     * @returns {Object} JSX markup for PDFPasswordForm
     */
    renderPasswordForm() {
        return (
            <PDFPasswordForm
                onSubmit={this.openPdfWithPassword}
                isPasswordInvalid={this.state.isPasswordInvalid}
            />
        );
    }

    render() {
        const pdfContainerWidth = this.state.windowWidth - 100;
        const pageWidthOnLargeScreen = (pdfContainerWidth <= variables.pdfPageMaxWidth)
            ? pdfContainerWidth : variables.pdfPageMaxWidth;
        const pageWidth = this.props.isSmallScreenWidth ? this.state.windowWidth - 30 : pageWidthOnLargeScreen;

        const pdfStyle = [styles.PDFView];
        const containerStyle = [styles.PDFView, this.props.style];

        // If we're requesting a password then we need to set the background to
        // defaultModalContainer color (white) and hide - but still render -
        // the PDF component.
        if (this.state.shouldRequestPassword) {
            pdfStyle.push(styles.invisible);
            containerStyle.push(styles.defaultModalContainer);
        }

        return (

            <View
                style={containerStyle}
                onLayout={event => this.setState({windowWidth: event.nativeEvent.layout.width})}
            >
                <View style={pdfStyle}>
                    <Document
                        loading={<FullScreenLoadingIndicator />}
                        file={this.props.sourceURL}
                        options={{
                            cMapUrl: 'cmaps/',
                            cMapPacked: true,
                        }}
                        externalLinkTarget="_blank"
                        onLoadSuccess={this.onDocumentLoadSuccess}
                        onPassword={this.initiatePasswordChallenge}
                    >
                        {
                            Array.from(
                                new Array(this.state.numPages),
                                (el, index) => (
                                    <Page
                                        width={pageWidth}
                                        key={`page_${index + 1}`}
                                        pageNumber={index + 1}
                                    />
                                ),
                            )
                        }
                    </Document>
                </View>

                {this.state.shouldRequestPassword && this.renderPasswordForm()}

            </View>
        );
    }
}

PDFView.propTypes = propTypes;
PDFView.defaultProps = defaultProps;
PDFView.displayName = 'PDFView';

export default withWindowDimensions(PDFView);
