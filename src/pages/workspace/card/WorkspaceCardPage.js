import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import {View, ScrollView} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import styles from '../../../styles/styles';
import Navigation from '../../../libs/Navigation/Navigation';
import compose from '../../../libs/compose';
import ROUTES from '../../../ROUTES';
import HeaderWithCloseButton from '../../../components/HeaderWithCloseButton';
import ScreenWrapper from '../../../components/ScreenWrapper';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';
import WorkspaceCardNoVBAView from './WorkspaceCardNoVBAView';
import WorkspaceCardVBANoECardView from './WorkspaceCardVBANoECardView';
import WorkspaceCardVBAWithECardView from './WorkspaceCardVBAWithECardView';
import ONYXKEYS from '../../../ONYXKEYS';
import {fetchFreePlanVerifiedBankAccount} from '../../../libs/actions/BankAccounts';
import BankAccount from '../../../libs/models/BankAccount';

const propTypes = {
    /** The route object passed to this page from the navigator */
    route: PropTypes.shape({
        /** Each parameter passed via the URL */
        params: PropTypes.shape({
            /** The policyID that is being configured */
            policyID: PropTypes.string.isRequired,
        }).isRequired,
    }).isRequired,

    ...withLocalizePropTypes,
};

class WorkspaceCardPage extends React.Component {
    componentDidMount() {
        fetchFreePlanVerifiedBankAccount();
    }

    render() {
        const achState = _.get(this.props.reimbursementAccount, ['achData', 'state'], '');
        const hasVBA = achState === BankAccount.STATE.OPEN;
        const isUsingECard = _.get(this.props.user, 'isUsingExpensifyCard');
        const policyID = _.get(this.props.route, ['params', 'policyID']);

        return (
            <ScreenWrapper>
                <HeaderWithCloseButton
                    title={this.props.translate('workspace.common.card')}
                    shouldShowBackButton
                    onBackButtonPress={() => Navigation.navigate(ROUTES.getWorkspaceInitialRoute(policyID))}
                    onCloseButtonPress={() => Navigation.dismissModal()}
                />
                <ScrollView style={[styles.settingsPageBackground]}>
                    <View style={styles.w100}>

                        {!hasVBA && (
                            <WorkspaceCardNoVBAView policyID={policyID} />
                        )}

                        {hasVBA && !isUsingECard && (
                            <WorkspaceCardVBANoECardView />
                        )}

                        {hasVBA && isUsingECard && (
                            <WorkspaceCardVBAWithECardView />
                        )}

                    </View>
                </ScrollView>
            </ScreenWrapper>
        );
    }
}

WorkspaceCardPage.propTypes = propTypes;

export default compose(
    withLocalize,
    withOnyx({
        user: {
            key: ONYXKEYS.USER,
        },
        reimbursementAccount: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
        },
    }),
)(WorkspaceCardPage);
