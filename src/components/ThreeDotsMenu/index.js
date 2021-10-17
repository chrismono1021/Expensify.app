import React, {Component} from 'react';
import {
    View, Pressable, Dimensions,
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import Popover from '../Popover';
import MenuItem from '../MenuItem';
import styles from '../../styles/styles';
import withLocalize, {withLocalizePropTypes} from '../withLocalize';
import compose from '../../libs/compose';
import Tooltip from '../Tooltip';
import {ThreeDots} from '../Icon/Expensicons';
import ThreeDotsMenuItemPropTypes from './ThreeDotsMenuItemPropTypes';

const propTypes = {
    ...withLocalizePropTypes,

    /** Tooltip for the popup icon */
    iconTooltip: PropTypes.string,

    /** icon for the popup trigger */
    icon: PropTypes.oneOfType([PropTypes.elementType, PropTypes.string]),

    /** Any additional styles to pass to the icon container. */
    iconStyles: PropTypes.arrayOf(PropTypes.object),

    /** The fill color to pass into the icon. */
    iconFill: PropTypes.string,

    /** Function to call on icon press */
    onIconPress: PropTypes.func,

    /** menuItems that'll show up on toggle of the popup menu */
    menuItems: ThreeDotsMenuItemPropTypes.isRequired,

    /** Offset of x, y for popup alignment  */
    popupOffset: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number,
    }),
};

const defaultProps = {
    iconTooltip: 'common.more',
    iconFill: undefined,
    iconStyles: [],
    icon: ThreeDots,
    onIconPress: () => {},
    popupOffset: {
        x: -200,
        y: 40,
    },
};


class ThreeDotsMenu extends Component {
    constructor(props) {
        super(props);

        this.togglePopupMenu = this.togglePopupMenu.bind(this);
        this.measurePopupMenuIconPosition = this.measurePopupMenuIconPosition.bind(this);
        this.popupMenuIconWrapper = null;
        this.state = {
            isPopupMenuActive: false,
            popupMenuIconPosition: {x: 0, y: 0},
        };
    }

    componentDidMount() {
        Dimensions.addEventListener('change', this.measurePopupMenuIconPosition);
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.measurePopupMenuIconPosition);
    }

    /**
     * Toggles the state variable isPopupMenuActive
     */
    togglePopupMenu() {
        this.setState(prevState => ({
            isPopupMenuActive: !prevState.isPopupMenuActive,
        }));
    }

    /**
     * This gets called onLayout to find the cooridnates of the wrapper for the pop up menu button
     */
    measurePopupMenuIconPosition() {
        if (this.popupMenuIconWrapper) {
            this.popupMenuIconWrapper.measureInWindow((x, y) => this.setState({
                popupMenuIconPosition: {x, y},
            }));
        }
    }

    render() {
        return (
            <>
                <View
                    ref={el => this.popupMenuIconWrapper = el}
                    onLayout={this.measurePopupMenuIconPosition}
                >
                    <Tooltip text={this.props.translate(this.props.iconTooltip)}>
                        <Pressable
                            onPress={() => {
                                // Add a prop here?
                                this.togglePopupMenu();
                                if (this.props.onIconPress) {
                                    this.props.onIconPress();
                                }
                            }}
                            style={[styles.touchableButtonImage, ...this.props.iconStyles]}
                        >
                            <Icon
                                src={this.props.icon}
                                fill={this.props.iconFill}
                            />
                        </Pressable>
                    </Tooltip>
                </View>
                <Popover
                    onClose={this.togglePopupMenu}
                    isVisible={this.state.isPopupMenuActive}
                    anchorPosition={{
                        left: this.state.popupMenuIconPosition.x + this.props.popupOffset.x,
                        top: this.state.popupMenuIconPosition.y + this.props.popupOffset.y,
                    }}
                    animationIn="fadeInDown"
                    animationOut="fadeOutUp"
                >
                    {this.props.menuItems.map(({icon, text, onPress: menuItemPress}) => (
                        <MenuItem
                            wrapperStyle={styles.mr3}
                            key={text}
                            icon={icon}
                            title={text}
                            onPress={(e) => {
                                menuItemPress(e);
                                this.togglePopupMenu();
                            }}
                        />
                    ))}
                </Popover>
            </>
        );
    }
}

ThreeDotsMenu.propTypes = propTypes;
ThreeDotsMenu.defaultProps = defaultProps;
ThreeDotsMenu.displayName = 'ThreeDotsMenu';
export default compose(
    withLocalize,
)(ThreeDotsMenu);

export {ThreeDotsMenuItemPropTypes};
