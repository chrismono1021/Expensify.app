import React from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import lodashGet from 'lodash/get';
import _ from 'underscore';
import ONYXKEYS from '../../ONYXKEYS';
import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import Navigation from '../../libs/Navigation/Navigation';
import Permissions from '../../libs/Permissions';
import styles from '../../styles/styles';
import TextInputWithLabel from '../../components/TextInputWithLabel';
import Button from '../../components/Button';
import Text from '../../components/Text';
import compose from '../../libs/compose';
import {setName, updateAvatar, setAvatarURL} from '../../libs/actions/Policy';
import Icon from '../../components/Icon';
import {Workspace} from '../../components/Icon/Expensicons';
import AvatarWithImagePicker from '../../components/AvatarWithImagePicker';
import defaultTheme from '../../styles/themes/default';

const propTypes = {
    /** List of betas */
    betas: PropTypes.arrayOf(PropTypes.string),

    ...withLocalizePropTypes,
};
const defaultProps = {
    betas: [],
};

class WorkspaceEditorPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            name: props.policy.name,
            avatarURL: props.policy.avatarURL,
        };

        this.submit = this.submit.bind(this);
    }

    submit() {
        const name = this.state.name.trim();
        const policyID = this.props.policy.id;

        setName(policyID, name);
    }

    render() {
        const {policy} = this.props;

        if (!Permissions.canUseFreePlan(this.props.betas)) {
            console.debug('Not showing workspace name editor page because user is not on free plan beta');
            return <Navigation.DismissModal />;
        }

        if (_.isEmpty(policy)) {
            return null;
        }

        return (
            <ScreenWrapper>
                <HeaderWithCloseButton
                    title={this.props.translate('workspace.editor.title')}
                    onCloseButtonPress={Navigation.dismissModal}
                />

                <View style={[styles.pageWrapper, styles.flex1, styles.pRelative]}>
                    <View style={[styles.w100, styles.flex1]}>
                        <AvatarWithImagePicker
                            avatarURL={this.state.avatarURL}
                            DefaultAvatar={() => (
                                <Icon
                                    src={Workspace}
                                    height={80}
                                    width={80}
                                    fill={defaultTheme.icon}
                                />
                            )}
                            style={[styles.mb3]}
                            anchorPosition={{top: 172, right: 18}}
                            isUsingDefaultAvatar={!this.state.avatarURL}
                            onImageSelected={(image) => {
                                this.setState({avatarURL: image.uri});
                            }}
                            onImageRemoved={() => this.setState({avatarURL: ''})}
                        />

                        <TextInputWithLabel
                            label={this.props.translate('workspace.editor.inputLabel')}
                            value={this.state.name}
                            onChangeText={name => this.setState({name})}
                            onSubmitEditting={this.submit}
                        />
                        <Text style={[styles.mt2]}>{this.props.translate('workspace.editor.helpText')}</Text>
                    </View>

                    <Button
                        success
                        style={[styles.w100]}
                        text={this.props.translate('workspace.editor.save')}
                        onPress={this.submit}
                        pressOnEnter
                    />
                </View>
            </ScreenWrapper>
        );
    }
}

WorkspaceEditorPage.propTypes = propTypes;
WorkspaceEditorPage.defaultProps = defaultProps;

export default compose(
    withOnyx({
        betas: {
            key: ONYXKEYS.BETAS,
        },
        policy: {
            key: (props) => {
                const routes = lodashGet(props.navigation.getState(), 'routes', []);
                const routeWithPolicyIDParam = _.find(routes, route => route.params && route.params.policyID);
                const policyID = lodashGet(routeWithPolicyIDParam, ['params', 'policyID']);
                return `${ONYXKEYS.COLLECTION.POLICY}${policyID}`;
            },
        },
    }),
    withLocalize,
)(WorkspaceEditorPage);
