import React from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import Icon from './Icon';
import networkPropTypes from './networkPropTypes';
import {withNetwork} from './OnyxProvider';
import Text from './Text';
import withLocalize, {withLocalizePropTypes} from './withLocalize';
import * as Expensicons from './Icon/Expensicons';
import themeColors from '../styles/themes/default';
import styles from '../styles/styles';
import FullScreenLoadingIndicator from './FullscreenLoadingIndicator';
import compose from '../libs/compose';

const propTypes = {
    /** Child elements */
    children: PropTypes.node.isRequired,

    isLoading: PropTypes.bool.isRequired,

    error: PropTypes.string,

    /** Props to fetch translation features */
    ...withLocalizePropTypes,

    /** Props to detect online status */
    network: networkPropTypes.isRequired,
};

const FullPageOfflineBlockingView = (props) => {
    if (network.isOffline) {
        return (
            <View
                style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}
            >
                <Icon
                    src={Expensicons.OfflineCloud}
                    fill={themeColors.offline}
                    width={50}
                    height={50}
                />
                <Text style={[styles.h1]}>{props.translate('common.youAppearToBeOffline')}</Text>
                <Text style={[styles.w70, styles.textAlignCenter]}>{props.translate('common.thisFeatureRequiresInternet')}</Text>
            </View>
        );
    }

    if (props.isLoading) {
        return <FullScreenLoadingIndicator />;
    }

    return props.children;
};

FullPageOfflineBlockingView.propTypes = propTypes;

export default compose(
    withLocalize,
    withNetwork(),
)(FullPageOfflineBlockingView);
