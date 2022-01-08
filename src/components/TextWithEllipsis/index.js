import React from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import _ from 'underscore';
import Text from '../Text';
import styles from '../../styles/styles';
import stylePropTypes from '../../styles/stylePropTypes';

const propTypes = {
    /** Leading text before the ellipsis */
    leadingText: PropTypes.string.isRequired,

    /** Text after the ellipsis */
    trailingText: PropTypes.string.isRequired,

    /** Styles for leading and trailing text */
    textStyle: stylePropTypes,

    /** Styles for leading text View */
    leadingTextParentStyle: stylePropTypes,

    /** Styles for parent View */
    wrapperStyle: stylePropTypes,
};

const defaultProps = {
    textStyle: {},
    leadingTextParentStyle: {},
    wrapperStyle: {},
};

const TextWithEllipsis = (props) => {
    const wrapperStyles = _.isArray(props.wrapperStyle) ? props.wrapperStyle : [props.wrapperStyle];
    const leadingTextParentStyles = _.isArray(props.leadingTextParentStyle) ? props.leadingTextParentStyle : [props.leadingTextParentStyle];
    return (
        <View style={[styles.flexRow, ...wrapperStyles]}>
            <View style={[styles.flexShrink1, ...leadingTextParentStyles]}>
                <Text style={props.textStyle} numberOfLines={1}>
                    {props.leadingText}
                </Text>
            </View>
            <View style={styles.flexShrink0}>
                <Text style={props.textStyle}>
                    {props.trailingText}
                </Text>
            </View>
        </View>
    );
};

TextWithEllipsis.propTypes = propTypes;
TextWithEllipsis.defaultProps = defaultProps;
TextWithEllipsis.displayName = 'TextWithEllipsis';

export default TextWithEllipsis;
