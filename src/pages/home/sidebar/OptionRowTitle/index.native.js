/* eslint-disable react/forbid-prop-types */
import React, {memo} from 'react';
import {
    Text,
} from 'react-native';
import styles from '../../../../styles/styles';
import propTypes from './OptionRowTitleProps';

const defaultProps = {
    style: null,
    tooltipEnabled: false,
};

const OptionRowTitle = ({
    style,
}) => (
    <Text style={[styles.optionDisplayName, style]} numberOfLines={1}>
        option.text
    </Text>
);

OptionRowTitle.propTypes = propTypes;
OptionRowTitle.defaultProps = defaultProps;
OptionRowTitle.displayName = 'OptionRowTitle';

export default memo(OptionRowTitle);
