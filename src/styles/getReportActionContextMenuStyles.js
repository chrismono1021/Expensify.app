import _ from 'underscore';
import contextActions from '../pages/home/report/ReportActionContextMenu/ContextActions';
import CONST from '../CONST';
import styles from './styles';
import variables from './variables';
import themeColors from './themes/default';

/**
 * Generate styles for the buttons in the mini comment actions menu.
 *
 * @param {String} [buttonState] - One of {'default', 'hovered', 'pressed'}
 * @returns {Array}
 */
function getMiniButtonStyle(buttonState = CONST.BUTTON_STATES.DEFAULT) {
    const defaultStyles = [styles.p1, styles.mv1, styles.mh1, {borderRadius: variables.componentBorderRadiusSmall}];
    switch (buttonState) {
        case CONST.BUTTON_STATES.HOVERED:
            return [
                ...defaultStyles,
                {
                    backgroundColor: themeColors.hoverComponentBG,
                },
            ];
        case CONST.BUTTON_STATES.PRESSED:
            return [
                ...defaultStyles,
                {
                    backgroundColor: themeColors.activeComponentBG,
                },
            ];
        case CONST.BUTTON_STATES.DEFAULT:
        default:
            return defaultStyles;
    }
}

/**
 * Use the styles of the buttons and the number of context actions to compute the dimensions
 * of the mini context actions menu.
 * @returns {{width: Number, height: Number}}
 */
function computeMiniReportActionContextMenuDimensions() {
    // Get the styles from the function that generates them, and merge the array of objects into a single object.
    const defaultButtonStyle = _.reduce(getMiniButtonStyle(), ((memo, style) => ({...memo, ...style})));

    // Compute the button width and height manually
    const buttonWidth = variables.iconSizeNormal
                        + (2 * defaultButtonStyle.padding)
                        + defaultButtonStyle.marginLeft
                        + defaultButtonStyle.marginRight;
    const buttonHeight = variables.iconSizeNormal
                        + (2 * defaultButtonStyle.padding)
                        + defaultButtonStyle.marginTop
                        + defaultButtonStyle.marginBottom;
    return {
        width: contextActions.length * buttonWidth,
        height: buttonHeight,
    };
}

/**
 * Get the fill color for the icons in the menu depending on the state of the button they're in.
 *
 * @param {String} [buttonState] - One of {'default', 'hovered', 'pressed'}
 * @returns {String}
 */
function getIconFillColor(buttonState = CONST.BUTTON_STATES.DEFAULT) {
    switch (buttonState) {
        case CONST.BUTTON_STATES.HOVERED:
            return themeColors.text;
        case CONST.BUTTON_STATES.PRESSED:
            return themeColors.heading;
        case CONST.BUTTON_STATES.DEFAULT:
        default:
            return themeColors.icon;
    }
}

const miniWrapperStyle = [
    styles.flexRow,
    {
        borderRadius: variables.componentBorderRadiusNormal,
        borderWidth: 1,
        backgroundColor: themeColors.componentBG,
        borderColor: themeColors.border,
    },
];

/**
 * Get the wrapper and button styles for the comment actions menu.
 *
 * @param {boolean} isMini
 * @returns {Object}
 */
function getReportActionContextMenuStyles(isMini) {
    return {
        getIconFillColor,
        getButtonStyle: isMini ? getMiniButtonStyle : () => {},
        wrapperStyle: isMini ? miniWrapperStyle : [],
    };
}

export default getReportActionContextMenuStyles;
export {computeMiniReportActionContextMenuDimensions};
