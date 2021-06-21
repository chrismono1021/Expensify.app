import moment from 'moment';
import lodashGet from 'lodash/get';
import React from 'react';
import {withOnyx} from 'react-native-onyx';
import Str from 'expensify-common/lib/str';
import {View, Text} from 'react-native';
import PropTypes from 'prop-types';
import ScreenWrapper from '../../components/ScreenWrapper';
import {fetchFreePlanVerifiedBankAccount} from '../../libs/actions/BankAccounts';
import ONYXKEYS from '../../ONYXKEYS';
import FullScreenLoadingIndicator from '../../components/FullscreenLoadingIndicator';
import Permissions from '../../libs/Permissions';
import Navigation from '../../libs/Navigation/Navigation';
import CONST from '../../CONST';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import compose from '../../libs/compose';
import styles from '../../styles/styles';
import KeyboardAvoidingView from '../../components/KeyboardAvoidingView';

// Steps
import BankAccountStep from './BankAccountStep';
import CompanyStep from './CompanyStep';
import RequestorStep from './RequestorStep';
import ValidationStep from './ValidationStep';
import BeneficialOwnersStep from './BeneficialOwnersStep';
import ROUTES from '../../ROUTES';

const propTypes = {
    /** List of betas */
    betas: PropTypes.arrayOf(PropTypes.string).isRequired,

    /** ACH data for the withdrawal account actively being set up */
    reimbursementAccount: PropTypes.shape({
        /** Whether we are loading the data via the API */
        loading: PropTypes.bool,

        /** A date that indicates the user has been throttled */
        throttledDate: PropTypes.string,

        /** Additional data for the account in setup */
        achData: PropTypes.shape({

            /** Step of the setup flow that we are on. Determines which view is presented. */
            currentStep: PropTypes.string,
        }),
    }),

    /** Current session for the user */
    session: PropTypes.shape({
        /** User login */
        email: PropTypes.string,
    }).isRequired,

    /** Route object from navigation */
    route: PropTypes.shape({
        /** Params that are passed into the route */
        params: PropTypes.shape({
            /** A step to navigate to if we need to drop the user into a specific point in the flow */
            stepToOpen: PropTypes.string,
        }),
    }),

    ...withLocalizePropTypes,
};

const defaultProps = {
    reimbursementAccount: {
        loading: true,
    },
    route: {
        params: {
            stepToOpen: '',
        },
    },
};

class ReimbursementAccountPage extends React.Component {
    componentDidMount() {
        // We can specify a specific step to navigate to by using route params when the component mounts.
        fetchFreePlanVerifiedBankAccount(this.getStepToOpenFromRouteParams());
    }

    componentDidUpdate(prevProps) {
        const currentStep = lodashGet(
            this.props,
            'reimbursementAccount.achData.currentStep',
            CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT,
        );
        const previousStep = lodashGet(
            prevProps,
            'reimbursementAccount.achData.currentStep',
            CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT,
        );

        if (currentStep === previousStep) {
            return;
        }

        // When the step changes we will navigate to update the route params. This is mostly cosmestic as we only use
        // the route params when the component first mounts to jump to a specific route instead of picking up where the
        // user left off in the flow.
        Navigation.navigate(ROUTES.getBankAccountRoute(this.getRouteForCurrentStep(currentStep)));
    }

    /**
     * @returns {String}
     */
    getStepToOpenFromRouteParams() {
        switch (lodashGet(this.props.route, ['params', 'stepToOpen'])) {
            case 'new':
                return CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT;
            case 'company':
                return CONST.BANK_ACCOUNT.STEP.COMPANY;
            case 'requestor':
                return CONST.BANK_ACCOUNT.STEP.REQUESTOR;
            case 'contract':
                return CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT;
            case 'validate':
                return CONST.BANK_ACCOUNT.STEP.VALIDATION;
            default:
                return '';
        }
    }

    /**
     * @param {String} currentStep
     * @returns {String}
     */
    getRouteForCurrentStep(currentStep) {
        switch (currentStep) {
            case CONST.BANK_ACCOUNT.STEP.COMPANY:
                return 'company';
            case CONST.BANK_ACCOUNT.STEP.REQUESTOR:
                return 'requestor';
            case CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT:
                return 'contract';
            case CONST.BANK_ACCOUNT.STEP.VALIDATION:
                return 'validate';
            case CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT:
            default:
                return 'new';
        }
    }

    render() {
        if (!Permissions.canUseFreePlan(this.props.betas)) {
            console.debug('Not showing new bank account page because user is not on free plan beta');
            Navigation.dismissModal();
            return null;
        }

        if (this.props.reimbursementAccount.loading) {
            return <FullScreenLoadingIndicator visible />;
        }

        const userHasPhonePrimaryEmail = Str.endsWith(this.props.session.email, CONST.SMS.DOMAIN);

        if (userHasPhonePrimaryEmail) {
            return (
                <View style={[styles.m5]}>
                    <Text>{this.props.translate('bankAccount.hasPhoneLoginError')}</Text>
                </View>
            );
        }

        const throttledDate = lodashGet(this.props, 'reimbursementAccount.throttledDate');
        if (throttledDate) {
            const throttledEnd = moment().add(24, 'hours');
            if (moment() < throttledEnd) {
                return (
                    <View style={[styles.m5]}>
                        <Text>
                            {this.props.translate('bankAccount.hasBeenThrottledError', {
                                fromNow: throttledEnd.fromNow(),
                            })}
                        </Text>
                    </View>
                );
            }
        }

        // We grab the currentStep from the achData to determine which view to display. The SetupWithdrawalAccount flow
        // allows us to continue the flow from various points depending on where the user left off.
        const achData = lodashGet(this.props, 'reimbursementAccount.achData', {});
        const currentStep = achData.currentStep || CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT;
        return (
            <ScreenWrapper>
                <KeyboardAvoidingView>
                    {currentStep === CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT && (
                        <BankAccountStep achData={achData} />
                    )}
                    {currentStep === CONST.BANK_ACCOUNT.STEP.COMPANY && (
                        <CompanyStep achData={achData} />
                    )}
                    {currentStep === CONST.BANK_ACCOUNT.STEP.REQUESTOR && (
                        <RequestorStep />
                    )}
                    {currentStep === CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT && (
                        <BeneficialOwnersStep companyName={achData.companyName} />
                    )}
                    {currentStep === CONST.BANK_ACCOUNT.STEP.VALIDATION && (
                        <ValidationStep />
                    )}
                </KeyboardAvoidingView>
            </ScreenWrapper>
        );
    }
}

ReimbursementAccountPage.propTypes = propTypes;
ReimbursementAccountPage.defaultProps = defaultProps;

export default compose(
    withOnyx({
        reimbursementAccount: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
        },
        session: {
            key: ONYXKEYS.SESSION,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
    }),
    withLocalize,
)(ReimbursementAccountPage);
