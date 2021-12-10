import React, {Component} from 'react';
import {ScrollView} from 'react-native';
import PropTypes from 'prop-types';
import HeaderWithCloseButton from '../../../components/HeaderWithCloseButton';
import Navigation from '../../../libs/Navigation/Navigation';
import ROUTES from '../../../ROUTES';
import * as User from '../../../libs/actions/User';
import styles from '../../../styles/styles';
import ScreenWrapper from '../../../components/ScreenWrapper';
import ExpensiTextInput from '../../../components/ExpensiTextInput';
import ExpensifyButton from '../../../components/ExpensifyButton';
import ExpensifyText from '../../../components/ExpensifyText';
import FixedFooter from '../../../components/FixedFooter';
import KeyboardAvoidingView from '../../../components/KeyboardAvoidingView';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';

const propTypes = {
    /* The user's primary email or phone number */
    accountPhoneOrEmail: PropTypes.string,

    ...withLocalizePropTypes,
};

const defaultProps = {
    accountPhoneOrEmail: 'jules',
};

class CloseAccountPage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            reasonForLeaving: 'a',
            phoneOrEmail: 'b',
            loading: false,
        };

        this.submitForm = this.submitForm.bind(this);
    }

    /**
     * Attempt to close the user's account
     */
    submitForm() {
        User.closeAccount({message: this.state.reasonForLeaving});
    }

    render() {
        return (
            <ScreenWrapper>
                <KeyboardAvoidingView>
                    <HeaderWithCloseButton
                        title={this.props.translate('closeAccountPage.closeAccount')}
                        shouldShowBackButton
                        onBackButtonPress={() => Navigation.navigate(ROUTES.SETTINGS_SECURITY)}
                        onCloseButtonPress={() => Navigation.dismissModal(true)}
                    />
                    <ScrollView
                        contentContainerStyle={[
                            styles.flexGrow1,
                            styles.flexColumn,
                            styles.p5,
                        ]}
                    >
                        <ExpensifyText>{this.props.translate('closeAccountPage.reasonForLeavingPrompt')}</ExpensifyText>
                        <ExpensiTextInput
                            value={this.state.reasonForLeaving}
                            onChangeText={reasonForLeaving => this.setState({reasonForLeaving})}
                            label={this.props.translate('closeAccountPage.typeMessageHere')}
                            containerStyles={[styles.mt5]}
                        />
                        <ExpensifyText style={[styles.mt5]}>
                            {this.props.translate('closeAccountPage.closeAccountWarning')}
                        </ExpensifyText>
                        <ExpensiTextInput
                            value={this.state.phoneOrEmail}
                            onChangeText={phoneOrEmail => this.setState({phoneOrEmail})}
                            label={this.props.translate('loginForm.phoneOrEmail')}
                            containerStyles={[styles.mt5]}
                        />
                    </ScrollView>
                    <FixedFooter>
                        <ExpensifyButton
                            success
                            style={[styles.mb5]}
                            text={this.props.translate('closeAccountPage.okayGotIt')}
                            isLoading={this.state.loading}
                            onPress={this.submitForm}
                            isDisabled={this.props.accountPhoneOrEmail !== this.state.phoneOrEmail}
                        />
                    </FixedFooter>
                </KeyboardAvoidingView>
            </ScreenWrapper>
        );
    }
}

CloseAccountPage.propTypes = propTypes;
CloseAccountPage.defaultProps = defaultProps;
CloseAccountPage.displayName = 'CloseAccountPage';

export default withLocalize(CloseAccountPage);
