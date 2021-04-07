import React, {PureComponent} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import Popover from '../Popover';
import styles from '../../styles/styles';
import withWindowDimensions, {windowDimensionsPropTypes} from '../withWindowDimensions';
import MenuItem from '../MenuItem';

const propTypes = {
    // Callback to fire on request to modal close
    onClose: PropTypes.func.isRequired,

    // State that determines whether to display the create menu or not
    isVisible: PropTypes.bool.isRequired,

    // Callback to fire when a CreateMenu item is selected
    onItemSelected: PropTypes.func.isRequired,

    // Menu items to be rendered on the list
    menuItems: PropTypes.arrayOf(
        PropTypes.shape({
            icon: PropTypes.func.isRequired,
            text: PropTypes.string.isRequired,
            onSelected: PropTypes.func.isRequired,
        }),
    ).isRequired,

    /* Configures when menu item actions are triggered: as soon as pressed or after the modal is closed.
    * On mobile native we need to wait for the modals to close, while on web as soon as clicked */
    actionExecutionStrategy: PropTypes.oneOf(['ON_PRESS', 'AFTER_MODAL_CLOSE']),

    ...windowDimensionsPropTypes,
};

const defaultProps = {
    actionExecutionStrategy: 'AFTER_MODAL_CLOSE',
};

class BaseCreateMenu extends PureComponent {
    /**
     * Select an item and apply action execution strategy
     *
     * @param {object} item - an item from this.props.menuItems
     */
    selectItem(item) {
        this.props.onItemSelected(item);

        switch (this.props.actionExecutionStrategy) {
            case 'ON_PRESS':
                item.onSelected();
                this.onModalHide = () => {};
                break;
            case 'AFTER_MODAL_CLOSE':
                this.onModalHide = () => item.onSelected();
                break;
            default:
                throw new Error(`Unexpected "actionExecutionStrategy" value: ${this.props.actionExecutionStrategy}`);
        }
    }

    render() {
        return (
            <Popover
                onClose={this.props.onClose}
                isVisible={this.props.isVisible}
                onModalHide={this.onModalHide}
                anchorPosition={styles.createMenuPosition}
            >
                <View style={this.props.isSmallScreenWidth ? {} : styles.createMenuContainer}>
                    {this.props.menuItems.map(item => (
                        <MenuItem
                            key={item.text}
                            icon={item.icon}
                            title={item.text}
                            onPress={() => this.selectItem(item)}
                        />
                    ))}
                </View>
            </Popover>
        );
    }
}

BaseCreateMenu.propTypes = propTypes;
BaseCreateMenu.defaultProps = defaultProps;
export default withWindowDimensions(BaseCreateMenu);
