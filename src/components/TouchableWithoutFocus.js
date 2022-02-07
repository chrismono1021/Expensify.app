import React from 'react';
import {TouchableOpacity} from 'react-native';
import PropTypes from 'prop-types';

const defaultPropTypes = {
    styles: [],
};

const propTypes = {

    /** Child node that should be touchable  */
    children: PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.func,
    ]).isRequired,

    /** Callback for onPress event */
    onPress: PropTypes.func.isRequired,

    /** Styles that should be passed to touchable container */
    styles: PropTypes.arrayOf(PropTypes.object),
};


/**
 * This component prevents the tapped element from capturing focus
 * @param {Object} props
 * @returns {React.Component}
 */
class TouchableWithoutFocus extends React.Component {
    constructor() {
        super();
        this.onPress = this.onPress.bind(this);
    }

    onPress() {
        if (!this.props.onPress) {
            return;
        }
        this.touchableRef.blur();
        this.props.onPress();
    }

    render() {
        return (
            <TouchableOpacity onPress={this.onPress} ref={e => this.touchableRef = e} style={this.props.styles}>
                {this.props.children}
            </TouchableOpacity>
        );
    }
}

TouchableWithoutFocus.propTypes = propTypes;
TouchableWithoutFocus.defaultProps = defaultPropTypes;
TouchableWithoutFocus.displayName = 'TouchableWithoutFocus';

export default TouchableWithoutFocus;
