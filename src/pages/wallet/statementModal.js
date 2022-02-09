import _ from 'underscore';
import React, {Component} from 'react';
import {View, TouchableOpacity} from 'react-native';
import PropTypes from 'prop-types';
import Header from '../../components/Header';
import Navigation from '../../libs/Navigation/Navigation';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import CONST from '../../CONST';
import Modal from '../../components/Modal/index.ios';
import themeColors from '../../styles/themes/default';
import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import {WebView} from 'react-native-webview';

const propTypes = {
    /** The route object passed to this page from the navigator */
    route: PropTypes.shape({
        /** Each parameter passed via the URL */
        params: PropTypes.shape({
            /** The statement year */
            year: PropTypes.string.isRequired,

            /** The statement month */
            month: PropTypes.string.isRequired,
        }).isRequired,
    }).isRequired,

    ...withLocalizePropTypes,
};

const WalletStatementModal = props => (
    <ScreenWrapper>
        <Modal
            onClose={Navigation.dismissModal}
            isVisible
            type={props.isSmallScreenWidth
                ? CONST.MODAL.MODAL_TYPE.BOTTOM_DOCKED
                : CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED}
        >
            <HeaderWithCloseButton
                title={props.translate('reportActionCompose.sendAttachment')}
            />
            <WebView
                originWhitelist={['*']}
                source={{ html: '<h1>Hello world</h1>' }}
            />
        </Modal>
    </ScreenWrapper>
);

WalletStatementModal.propTypes = propTypes;
WalletStatementModal.displayName = 'WalletStatementModal';
export default withLocalize(WalletStatementModal);

