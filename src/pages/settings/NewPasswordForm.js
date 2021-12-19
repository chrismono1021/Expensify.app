import React from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import ExpensifyText from '../../components/ExpensifyText';
import withLocalize, {
    withLocalizePropTypes,
} from '../../components/withLocalize';
import CONST from '../../CONST';
import styles from '../../styles/styles';
import TextInput from '../../components/TextInput';
import InlineErrorText from '../../components/InlineErrorText';

const propTypes = {
    /** String to control the first password box in the form */
    password: PropTypes.string.isRequired,

    /** Function to update the first password box in the form */
    updatePassword: PropTypes.func.isRequired,

    /** Callback function called with boolean value for if the password form is valid  */
    updateIsFormValid: PropTypes.func.isRequired,

    /** Callback function for when form is submitted  */
    onSubmitEditing: PropTypes.func.isRequired,
    ...withLocalizePropTypes,
};

class NewPasswordForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            confirmNewPassword: '',
            passwordHintError: false,
            shouldShowPasswordConfirmError: false,
        };
    }

    componentDidUpdate(prevProps, prevState) {
        const eitherPasswordChanged = (this.props.password !== prevProps.password)
        || this.state.confirmNewPassword !== prevState.confirmNewPassword;
        if (eitherPasswordChanged) {
            this.props.updateIsFormValid(this.isValidForm());
        }
    }

    onBlurNewPassword() {
        if (this.state.passwordHintError) {
            return;
        }
        if (this.props.password && !this.isValidPassword()) {
            this.setState({passwordHintError: true});
        }
    }

    onBlurConfirmPassword() {
        if (this.state.shouldShowPasswordConfirmError) {
            return;
        }
        if (this.state.confirmNewPassword && !this.doPasswordsMatch()) {
            this.setState({shouldShowPasswordConfirmError: true});
        }
    }

    isValidPassword() {
        return this.props.password.match(CONST.PASSWORD_COMPLEXITY_REGEX_STRING);
    }

    /**
     * checks if the password invalid
     * @returns {Boolean}
    */
    isInvalidPassword() {
        return this.state.passwordHintError && this.props.password && !this.isValidPassword();
    }

    doPasswordsMatch() {
        return this.props.password === this.state.confirmNewPassword;
    }

    isValidForm() {
        return this.isValidPassword() && this.doPasswordsMatch();
    }

    showPasswordMatchError() {
        return Boolean(
            !this.doPasswordsMatch()
            && this.state.shouldShowPasswordConfirmError
            && this.state.confirmNewPassword,
        );
    }

    render() {
        return (
            <>
                <View style={styles.mb6}>
                    <TextInput
                        label={`${this.props.translate('setPasswordPage.enterPassword')}`}
                        secureTextEntry
                        autoCompleteType="password"
                        textContentType="password"
                        value={this.props.password}
                        onChangeText={password => this.props.updatePassword(password)}
                        onBlur={() => this.onBlurNewPassword()}
                    />
                    <ExpensifyText
                        style={[
                            styles.textLabelSupporting,
                            styles.mt1,
                            this.isInvalidPassword() && styles.formError,
                        ]}
                    >
                        {this.props.translate('setPasswordPage.newPasswordPrompt')}
                    </ExpensifyText>
                </View>
                <View style={styles.mb6}>
                    <TextInput
                        label={`${this.props.translate('setPasswordPage.confirmNewPassword')}*`}
                        secureTextEntry
                        autoCompleteType="password"
                        textContentType="password"
                        value={this.state.confirmNewPassword}
                        onChangeText={confirmNewPassword => this.setState({confirmNewPassword})}
                        onSubmitEditing={() => this.props.onSubmitEditing()}
                        onBlur={() => this.onBlurConfirmPassword()}
                    />
                    {this.showPasswordMatchError() && (
                        <InlineErrorText>
                            {this.props.translate('setPasswordPage.passwordsDontMatch')}
                        </InlineErrorText>
                    )}
                </View>
            </>
        );
    }
}

NewPasswordForm.propTypes = propTypes;

export default withLocalize(NewPasswordForm);
