import React from 'react';
import {View, TouchableOpacity} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import PaymentMethodList from './PaymentMethodList';
import ROUTES from '../../../ROUTES';
import HeaderWithCloseButton from '../../../components/HeaderWithCloseButton';
import PasswordPopover from '../../../components/PasswordPopover';
import ScreenWrapper from '../../../components/ScreenWrapper';
import Navigation from '../../../libs/Navigation/Navigation';
import styles from '../../../styles/styles';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';
import compose from '../../../libs/compose';
import KeyboardAvoidingView from '../../../components/KeyboardAvoidingView/index';
import Text from '../../../components/Text';
import {deleteBankAccount} from '../../../libs/actions/BankAccounts';
import {deleteCard, getPaymentMethods, setWalletLinkedAccount} from '../../../libs/actions/PaymentMethods';
import Popover from '../../../components/Popover';
import {PayPal, Bank, CreditCard} from '../../../components/Icon/Expensicons';
import MenuItem from '../../../components/MenuItem';
import getClickedElementLocation from '../../../libs/getClickedElementLocation';
import withWindowDimensions, {windowDimensionsPropTypes} from '../../../components/withWindowDimensions';
import NameValuePair from '../../../libs/actions/NameValuePair';
import CONST from '../../../CONST';
import CurrentWalletBalance from '../../../components/CurrentWalletBalance';
import ONYXKEYS from '../../../ONYXKEYS';
import Permissions from '../../../libs/Permissions';

const PAYPAL = 'payPalMe';
const DEBIT_CARD = 'debitCard';

const propTypes = {
    ...windowDimensionsPropTypes,
    ...withLocalizePropTypes,

    /** List of betas available to current user */
    betas: PropTypes.arrayOf(PropTypes.string),
};

const defaultProps = {
    betas: [],
};

class PaymentsPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            shouldShowAddPaymentMenu: false,
            shouldShowDefaultDeleteMenu: false,
            shouldShowPasswordPrompt: false,
            selectedPaymentMethod: {},
            formattedSelectedPaymentMethod: {},
            anchorPositionTop: 0,
            anchorPositionLeft: 0,
            isLoadingPaymentMethods: true,
        };

        this.paymentMethodPressed = this.paymentMethodPressed.bind(this);
        this.addPaymentMethodTypePressed = this.addPaymentMethodTypePressed.bind(this);
        this.hideAddPaymentMenu = this.hideAddPaymentMenu.bind(this);
        this.hideDefaultDeleteMenu = this.hideDefaultDeleteMenu.bind(this);
        this.makeDefaultPaymentMethod = this.makeDefaultPaymentMethod.bind(this);
        this.deletePaymentMethod = this.deletePaymentMethod.bind(this);
        this.hidePasswordPrompt = this.hidePasswordPrompt.bind(this);
        this.callPasswordCallbackAndHidePopover = this.callPasswordCallbackAndHidePopover.bind(this);
    }

    componentDidMount() {
        getPaymentMethods().then(() => {
            this.setState({isLoadingPaymentMethods: false});
        });
    }

    /**
     * Display the delete/default menu, or the add payment method menu
     *
     * @param {Object} nativeEvent
     * @param {String} accountType
     * @param {String} account
     */
    paymentMethodPressed(nativeEvent, accountType, account) {
        const position = getClickedElementLocation(nativeEvent);
        if (accountType) {
            let formattedSelectedPaymentMethod;
            if (accountType === PAYPAL) {
                formattedSelectedPaymentMethod = {
                    title: 'PayPal.me',
                    icon: PayPal,
                };
            } else if (accountType === 'bankAccount') {
                formattedSelectedPaymentMethod = {
                    title: account.addressName,
                    icon: Bank,
                };
            } else {
                formattedSelectedPaymentMethod = {
                    title: account.cardName,
                    icon: CreditCard,
                };
            }
            this.setState({
                shouldShowDefaultDeleteMenu: true,
                selectedPaymentMethod: account,
                selectedPaymentMethodType: accountType,
                anchorPositionTop: position.bottom,

                // We want the position to be 20px to the right of the left border
                anchorPositionLeft: position.left + 20,
                formattedSelectedPaymentMethod,
            });
        } else {
            this.setState({
                shouldShowAddPaymentMenu: true,
                anchorPositionTop: position.bottom,

                // We want the position to be 20px to the right of the left border
                anchorPositionLeft: position.left + 20,
            });
        }
    }

    /**
     * Navigate to the appropriate payment type addition screen
     *
     * @param {String} paymentType
     */
    addPaymentMethodTypePressed(paymentType) {
        this.hideAddPaymentMenu();

        if (paymentType === PAYPAL) {
            Navigation.navigate(ROUTES.SETTINGS_ADD_PAYPAL_ME);
        }

        if (paymentType === DEBIT_CARD) {
            Navigation.navigate(ROUTES.SETTINGS_ADD_DEBIT_CARD);
        }
    }

    /**
     * Hide the add payment modal
     */
    hideAddPaymentMenu() {
        this.setState({shouldShowAddPaymentMenu: false});
    }

    /**
     * Hide the default / delete modal
     */
    hideDefaultDeleteMenu() {
        this.setState({shouldShowDefaultDeleteMenu: false});
    }

    hidePasswordPrompt() {
        this.setState({shouldShowPasswordPrompt: false});
    }

    callPasswordCallbackAndHidePopover(password) {
        this.hidePasswordPrompt();
        this.state.passwordFormCallback(password);
    }

    makeDefaultPaymentMethod(password) {
        if (this.state.selectedPaymentMethodType === 'bankAccount') {
            setWalletLinkedAccount(password, this.state.selectedPaymentMethod.bankAccountID, null);
        } else if (this.state.selectedPaymentMethodType === 'card') {
            setWalletLinkedAccount(password, null, this.state.selectedPaymentMethod.managedBy);
        }
    }

    deletePaymentMethod(password) {
        if (this.state.selectedPaymentMethodType === 'PayPal.me') {
            NameValuePair.set(CONST.NVP.PAYPAL_ME_ADDRESS, null);
        } else if (this.state.selectedPaymentMethodType === 'bankAccount') {
            deleteBankAccount(password, this.state.selectedPaymentMethod.bankAccountID);
        } else if (this.state.selectedPaymentMethodType === 'card') {
            deleteCard(this.state.selectedPaymentMethod.cardID);
        }
    }

    render() {
        return (
            <ScreenWrapper>
                <KeyboardAvoidingView>
                    <HeaderWithCloseButton
                        title={this.props.translate('common.payments')}
                        shouldShowBackButton
                        onBackButtonPress={() => Navigation.navigate(ROUTES.SETTINGS)}
                        onCloseButtonPress={() => Navigation.dismissModal(true)}
                    />
                    <View>
                        {
                            Permissions.canUseWallet(this.props.betas) && <CurrentWalletBalance />
                        }
                        <Text
                            style={[styles.ph5, styles.formLabel]}
                        >
                            {this.props.translate('paymentsPage.paymentMethodsTitle')}
                        </Text>
                        <PaymentMethodList
                            onPress={this.paymentMethodPressed}
                            style={[styles.flex4]}
                            isLoadingPayments={this.state.isLoadingPaymentMethods}
                        />
                    </View>
                    <Popover
                        isVisible={this.state.shouldShowAddPaymentMenu}
                        onClose={this.hideAddPaymentMenu}
                        anchorPosition={{
                            top: this.state.anchorPositionTop,
                            left: this.state.anchorPositionLeft,
                        }}
                    >
                        <MenuItem
                            title="PayPal.me"
                            icon={PayPal}
                            onPress={() => this.addPaymentMethodTypePressed(PAYPAL)}
                        />
                        <MenuItem
                            title="Debit Card"
                            icon={CreditCard}
                            onPress={() => this.addPaymentMethodTypePressed(DEBIT_CARD)}
                        />
                    </Popover>
                    <Popover
                        isVisible={this.state.shouldShowDefaultDeleteMenu}
                        onClose={this.hideDefaultDeleteMenu}
                        anchorPosition={{
                            top: this.state.anchorPositionTop,
                            left: this.state.anchorPositionLeft,
                        }}
                    >
                        {this.props.isSmallScreenWidth && (
                            <MenuItem
                                title={this.state.formattedSelectedPaymentMethod.title}
                                icon={Bank}
                                description={this.state.formattedSelectedPaymentMethod.description}
                                onPress={() => {}}
                            />
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                this.setState({
                                    shouldShowPasswordPrompt: true,
                                    shouldShowDefaultDeleteMenu: false,
                                    passwordButtonText: 'Make Default Payment Method',
                                    isDangerousAction: false,
                                    passwordFormCallback: this.makeDefaultPaymentMethod,
                                });
                            }}
                            style={[styles.button, styles.mh2, styles.mt2, styles.defaultOrDeleteButton]}
                        >
                            <Text style={[styles.buttonText]}>
                                Make Default Payment Method
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                this.setState({
                                    shouldShowPasswordPrompt: true,
                                    shouldShowDefaultDeleteMenu: false,
                                    passwordButtonText: this.props.translate('common.delete'),
                                    isDangerousAction: true,
                                    passwordFormCallback: this.deletePaymentMethod,
                                });
                            }}
                            style={[
                                styles.button,
                                styles.buttonDanger,
                                styles.mh2,
                                styles.mv2,
                                styles.defaultOrDeleteButton,
                            ]}
                        >
                            <Text style={[styles.buttonText]}>
                                {this.props.translate('common.delete')}
                            </Text>
                        </TouchableOpacity>
                    </Popover>
                    <PasswordPopover
                        isVisible={this.state.shouldShowPasswordPrompt}
                        onClose={this.hidePasswordPrompt}
                        anchorPosition={{
                            top: this.state.anchorPositionTop,
                            left: this.state.anchorPositionLeft,
                        }}
                        onSubmit={this.callPasswordCallbackAndHidePopover}
                        submitButtonText={this.state.passwordButtonText}
                        isDangerousAction={this.state.isDangerousAction}
                    />
                </KeyboardAvoidingView>
            </ScreenWrapper>
        );
    }
}

PaymentsPage.propTypes = propTypes;
PaymentsPage.defaultProps = defaultProps;
PaymentsPage.displayName = 'PaymentsPage';

export default compose(
    withWindowDimensions,
    withLocalize,
    withOnyx({
        betas: {
            key: ONYXKEYS.BETAS,
        },
    }),
)(PaymentsPage);
