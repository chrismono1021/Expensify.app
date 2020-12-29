import React from 'react';
import {
    Text, TextInput, View
} from 'react-native';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import {withRouter} from '../../libs/Router';
import styles from '../../styles/styles';
import SubmitButton from './SubmitButton';
import themeColors from '../../styles/themes/default';
import {signIn} from '../../libs/actions/Session';
import compose from '../../libs/compose';
import ONYXKEYS from '../../ONYXKEYS';
import ChangeExpensifyLoginLink from './ChangeExpensifyLoginLink';

const propTypes = {
    // These are from withRouter
    // eslint-disable-next-line react/forbid-prop-types
    match: PropTypes.object.isRequired,

    /* Onyx Props */

    // The details about the account that the user is signing in with
    account: PropTypes.shape({
        // Whether or not the account already exists
        accountExists: PropTypes.bool,

        // Whether or not there have been chat reports shared with this user
        canAccessExpensifyCash: PropTypes.bool,

        // Whether or not two factor authentication is required
        requiresTwoFactorAuth: PropTypes.bool,
    }),

    // The session of the logged in person
    session: PropTypes.shape({
        // Whether or not a sign on form is loading (being submitted)
        isLoading: PropTypes.bool,
    }),
};

const defaultProps = {
    account: {},
    session: {},
};

class PasswordForm extends React.Component {
    constructor(props) {
        super(props);

        this.validateAndSubmitForm = this.validateAndSubmitForm.bind(this);

        this.state = {
            formError: false,
            password: '',
            twoFactorAuthCode: '',
        };
    }

    /**
     * Check that all the form fields are valid, then trigger the submit callback
     */
    validateAndSubmitForm() {
        if (!this.state.password.trim()
            || (this.props.account.requiresTwoFactorAuth && !this.state.twoFactorAuthCode.trim())
        ) {
            this.setState({formError: 'Please fill out all fields'});
            return;
        }

        this.setState({
            formError: null,
        });

        signIn(this.state.password, this.props.match.params.exitTo, this.state.twoFactorAuthCode);
    }

    render() {
        return (
            <View style={[styles.loginFormContainer]}>
                <View style={[styles.mb4]}>
                    <Text style={[styles.formLabel]}>Password</Text>
                    <TextInput
                        style={[styles.textInput]}
                        secureTextEntry
                        autoCompleteType="password"
                        textContentType="password"
                        value={this.state.password}
                        onChangeText={text => this.setState({password: text})}
                        onSubmitEditing={this.validateAndSubmitForm}
                        autoFocus
                    />
                </View>
                {this.props.account.requiresTwoFactorAuth && (
                    <View style={[styles.mb4]}>
                        <Text style={[styles.formLabel]}>Two Factor Code</Text>
                        <TextInput
                            style={[styles.textInput]}
                            value={this.state.twoFactorAuthCode}
                            placeholder="Required when 2FA is enabled"
                            placeholderTextColor={themeColors.textSupporting}
                            onChangeText={text => this.setState({twoFactorAuthCode: text})}
                            onSubmitEditing={this.validateAndSubmitForm}
                        />
                    </View>
                )}
                <View>
                    <SubmitButton
                        text="Sign In"
                        isLoading={this.props.session.isLoading}
                        onClick={this.validateAndSubmitForm}
                    />
                    <ChangeExpensifyLoginLink />
                </View>
                {this.state.formError && (
                    <Text style={[styles.formError]}>
                        {this.state.formError}
                    </Text>
                )}
            </View>
        );
    }
}

PasswordForm.propTypes = propTypes;
PasswordForm.defaultProps = defaultProps;

export default compose(
    withRouter,
    withOnyx({
        account: {key: ONYXKEYS.ACCOUNT},
        session: {key: ONYXKEYS.SESSION},
    }),
)(PasswordForm);
