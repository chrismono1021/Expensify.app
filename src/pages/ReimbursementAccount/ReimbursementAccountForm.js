import _ from 'underscore';
import lodashGet from 'lodash/get';
import React from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import styles from '../../styles/styles';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import reimbursementAccountPropTypes from './reimbursementAccountPropTypes';
import compose from '../../libs/compose';
import ONYXKEYS from '../../ONYXKEYS';
import FormAlertWithSubmitButton from '../../components/FormAlertWithSubmitButton';
import CONST from '../../CONST';
import FormScrollView from '../../components/FormScrollView';
import * as BankAccounts from '../../libs/actions/BankAccounts';
import * as ErrorUtils from '../../libs/ErrorUtils';

const propTypes = {
    /** Data for the bank account actively being set up */
    reimbursementAccount: reimbursementAccountPropTypes,

    /** Called when the form is submitted */
    onSubmit: PropTypes.func.isRequired,

    ...withLocalizePropTypes,
};

const defaultProps = {
    reimbursementAccount: {},
};

class ReimbursementAccountForm extends React.Component {
    componentWillUnmount() {
        BankAccounts.resetReimbursementAccount();
    }

    getErrorMessage() {
        const latestErrorMessage = ErrorUtils.getLatestErrorMessage(this.props.reimbursementAccount);
        return this.props.reimbursementAccount.error || (typeof latestErrorMessage === 'string' ? latestErrorMessage : '');
    }

    render() {
        const errorMessage = this.getErrorMessage();

        const currentStep = lodashGet(
            this.props,
            'reimbursementAccount.achData.currentStep',
            CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT,
        );

        return (
            <FormScrollView
                ref={el => this.form = el}
            >
                {/* Form elements */}
                <View style={[styles.mh5, styles.mb5]}>
                    {this.props.children}
                </View>
                <FormAlertWithSubmitButton
                    isAlertVisible={Boolean(errorMessage)}
                    buttonText={currentStep === CONST.BANK_ACCOUNT.STEP.VALIDATION ? this.props.translate('validationStep.buttonText') : this.props.translate('common.saveAndContinue')}
                    onSubmit={this.props.onSubmit}
                    onFixTheErrorsLinkPressed={() => {
                        this.form.scrollTo({y: 0, animated: true});
                    }}
                    message={errorMessage}
                    isMessageHtml={this.props.reimbursementAccount.isErrorHtml}
                    isLoading={this.props.reimbursementAccount.loading || this.props.reimbursementAccount.isLoading}
                />
            </FormScrollView>
        );
    }
}

ReimbursementAccountForm.propTypes = propTypes;
ReimbursementAccountForm.defaultProps = defaultProps;
export default compose(
    withLocalize,
    withOnyx({
        reimbursementAccount: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
        },
    }),
)(ReimbursementAccountForm);
