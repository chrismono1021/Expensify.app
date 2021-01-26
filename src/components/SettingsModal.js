import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import SettingsPage from '../pages/SettingsPage';
import CONST from '../CONST';
import themeColors from '../styles/themes/default';
import ONYXKEYS from '../ONYXKEYS';
import ModalWithHeader from './ModalWithHeader';
import {redirect} from '../libs/actions/App';
import ROUTES from '../ROUTES';

/**
 * Right-docked modal view showing a user's settings.
 */
const propTypes = {
    // Is the Settings Modal visible or not?
    isVisible: PropTypes.bool,

    /* Onyx Props */
    // Currently viewed reportID
    currentlyViewedReportID: PropTypes.string,
};

const defaultProps = {
    isVisible: false,
    currentlyViewedReportID: '',
};

class SettingsModal extends Component {
    constructor(props) {
        super(props);

        this.onClose = this.onClose.bind(this);
    }

    /**
     * Return to the report that was being viewed upon close.
     */
    onClose() {
        redirect(ROUTES.getReportRoute(this.props.currentlyViewedReportID));
    }

    render() {
        return (
            <ModalWithHeader
                type={CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED}
                onClose={this.onClose}
                isVisible={this.props.isVisible}
                title="Settings"
                backgroundColor={themeColors.componentBG}
            >
                <SettingsPage />
            </ModalWithHeader>
        );
    }
}

SettingsModal.propTypes = propTypes;
SettingsModal.defaultProps = defaultProps;
export default withOnyx({
    session: {
        key: ONYXKEYS.SESSION,
    },
    currentlyViewedReportID: {
        key: ONYXKEYS.CURRENTLY_VIEWED_REPORTID,
    },
})(SettingsModal);
