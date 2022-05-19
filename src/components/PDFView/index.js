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
};

const defaultProps = {
    sourceURL: '',
    style: {},
};

class PDFView extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            numPages: null,
            windowWidth: Dimensions.get('window').width,
            requestPassword: true,
            passwordInvalid: false,
        };
        this.onDocumentLoadSuccess = this.onDocumentLoadSuccess.bind(this);
        this.onPassword = this.onPassword.bind(this);
        this.onPasswordFormSubmit = this.onPasswordFormSubmit.bind(this);
    }

    /**
     * Callback to be called to set the number of pages on PDF.
     * Also update state to hide/reset PDF password form.
     *
     * @param {*} {numPages} No of pages in the rendered PDF
     * @memberof PDFView
     */
    onDocumentLoadSuccess({numPages}) {
        this.setState({
            numPages,
            requestPassword: false,
            passwordInvalid: false,
        });
    }

    /**
     * Event handler for password-protected PDFs. The react-pdf/Document
     * component calls this handler to indicate that a PDF requires a
     * password, or to indicate that a previously provided password was
     * invalid.
     *
     * The PasswordResponses constants were copied from react-pdf because
     * they're not exported in entry.webpack.
     *
     * @param {*} callback Callback used to send password to react-pdf
     * @param {number} reason Reason code for password request
     */
    onPassword(callback, reason) {
        this.onPasswordCallback = callback;

        const PasswordResponses = {
            NEED_PASSWORD: 1,
            INCORRECT_PASSWORD: 2,
        };

        if (reason === PasswordResponses.NEED_PASSWORD) {
            this.setState({requestPassword: true});
        } else if (reason === PasswordResponses.INCORRECT_PASSWORD) {
            this.setState({requestPassword: true, passwordInvalid: true});
        } else {
            Log.warn('[PDFView] pdf password requested for unknown reason: ', reason);
        }
    }

    /**
     * Event handler for PDFPasswordForm submission. When a password
     * is received from the password form the handler calls the password
     * callback previously received from react-pdf.
     *
     * @param {string} password The password entered in the form
     */
    onPasswordFormSubmit(password) {
        this.onPasswordCallback(password);
    }

    /**
     * Generate markup for PDFPasswordForm. This form is only displayed if a
     * password is required to open a PDF.
     *
     * @returns {*} JSX markup for PDFPasswordForm
     */
    renderPasswordForm() {
        return (
            <PDFPasswordForm
                onSubmit={this.onPasswordFormSubmit}
                passwordInvalid={this.state.passwordInvalid}
            />
        );
    }

    render() {
        const pdfContainerWidth = this.state.windowWidth - 100;
        const pageWidthOnLargeScreen = (pdfContainerWidth <= variables.pdfPageMaxWidth)
            ? pdfContainerWidth : variables.pdfPageMaxWidth;
        const pageWidth = this.props.isSmallScreenWidth ? this.state.windowWidth - 30 : pageWidthOnLargeScreen;
        const pdfShowHideStyle = this.state.requestPassword ? [styles.PDFView, styles.dNone] : styles.PDFView;

        return (
            <View
                style={[styles.PDFView, this.props.style]}
                onLayout={event => this.setState({windowWidth: event.nativeEvent.layout.width})}
            >
                {this.state.requestPassword && this.renderPasswordForm()}

                <View style={pdfShowHideStyle}>
                    <Document
                        loading={<FullScreenLoadingIndicator />}
                        file={this.props.sourceURL}
                        options={{
                            cMapUrl: 'cmaps/',
                            cMapPacked: true,
                        }}
                        externalLinkTarget="_blank"
                        onLoadSuccess={this.onDocumentLoadSuccess}
                        onPassword={this.onPassword}
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

            </View>
        );
    }
}

PDFView.propTypes = propTypes;
PDFView.defaultProps = defaultProps;
PDFView.displayName = 'PDFView';

export default withWindowDimensions(PDFView);
