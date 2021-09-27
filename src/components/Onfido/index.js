import './index.css';
import lodashGet from 'lodash/get';
import React from 'react';
import * as OnfidoSDK from 'onfido-sdk-ui';
import withLocalize, {withLocalizePropTypes} from '../withLocalize';
import onfidoPropTypes from './onfidoPropTypes';
import CONST from '../../CONST';

const propTypes = {
    ...withLocalizePropTypes,
    ...onfidoPropTypes,
};

class Onfido extends React.Component {
    componentDidMount() {
        this.onfidoOut = OnfidoSDK.init({
            token: this.props.sdkToken,
            containerId: CONST.ONFIDO.CONTAINER_ID,
            steps: [
                {
                    type: CONST.ONFIDO.TYPE.DOCUMENT,
                    options: {
                        useLiveDocumentCapture: true,
                        forceCrossDevice: true,
                        showCountrySelection: false,
                        documentTypes: {
                            driving_licence: {
                                country: null,
                            },
                            national_identity_card: {
                                country: null,
                            },
                            residence_permit: {
                                country: null,
                            },
                            passport: true,
                        },
                    },
                },
                {
                    type: CONST.ONFIDO.TYPE.FACE,
                    options: {
                        requestedVariant: CONST.ONFIDO.VARIANT.VIDEO,
                        uploadFallback: false,
                    },
                },
            ],
            smsNumberCountryCode: CONST.ONFIDO.SMS_NUMBER_COUNTRY_CODE.US,
            showCountrySelection: false,
            onComplete: this.props.onSuccess,
            onError: (error) => {
                const errorMessage = lodashGet(error, 'message', CONST.ERROR.UNKNOWN_ERROR);
                this.props.onError(errorMessage);
            },
            onUserExit: this.props.onUserExit,
            onModalRequestClose: () => {},
        });
    }

    componentWillUnmount() {
        if (this.onfidoOut) {
            this.onfidoOut.tearDown();
        }
    }

    render() {
        return (
            <div id={CONST.ONFIDO.CONTAINER_ID} />
        );
    }
}

Onfido.propTypes = propTypes;
export default withLocalize(Onfido);
