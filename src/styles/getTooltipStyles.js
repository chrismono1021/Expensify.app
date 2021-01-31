import spacing from './utilities/spacing';
import styles from './styles';
import colors from './colors';
import themeColors from './themes/default';
import fontFamily from './fontFamily';
import variables from './variables';

// This defines the proximity with the edge of the window in which tooltips should not be displayed.
// If a tooltip is too close to the edge of the screen, we'll shift it towards the center.
const GUTTER_WIDTH = 16;

// The height of a tooltip pointer
const POINTER_HEIGHT = 4;

// The width of a tooltip pointer
const POINTER_WIDTH = 12;

/**
 * The Expensify.cash repo is very consistent about doing spacing in multiples of 4.
 * In an effort to maintain that consistency, we'll make sure that any distance we're shifting the tooltip
 * is a multiple of 4.
 *
 * @param {Number} n
 * @returns {Number}
 */
function roundToNearestMultipleOfFour(n) {
    if (n > 0) {
        return Math.ceil(n / 4.0) * 4;
    }

    if (n < 0) {
        return Math.floor(n / 4.0) * 4;
    }

    return 0;
}

/**
 * Compute the amount the tooltip needs to be horizontally shifted in order to keep it from displaying in the gutters.
 *
 * @param {Number} windowWidth - The width of the window.
 * @param {Number} xOffset - The distance between the left edge of the window
 *                           and the left edge of the wrapped component.
 * @param {Number} componentWidth - The width of the wrapped component.
 * @param {Number} tooltipWidth - The width of the tooltip itself.
 * @returns {Number}
 */
function computeHorizontalShift(windowWidth, xOffset, componentWidth, tooltipWidth) {
    // First find the left and right edges of the tooltip (by default, it is centered on the component).
    const componentCenter = xOffset + (componentWidth / 2);
    const tooltipLeftEdge = componentCenter - (tooltipWidth / 2);
    const tooltipRightEdge = componentCenter + (tooltipWidth / 2);

    if (tooltipLeftEdge < GUTTER_WIDTH) {
        // Tooltip is in left gutter, shift right by a multiple of four.
        return roundToNearestMultipleOfFour(GUTTER_WIDTH - tooltipLeftEdge);
    }

    if (tooltipRightEdge > (windowWidth - GUTTER_WIDTH)) {
        // Tooltip is in right gutter, shift left by a multiple of four.
        return roundToNearestMultipleOfFour(windowWidth - GUTTER_WIDTH - tooltipRightEdge);
    }

    // Tooltip is not in the gutter, so no need to shift it horizontally
    return 0;
}

/**
 * Generate styles for the tooltip component.
 *
 * @param {Number} currentSize - The current size of the tooltip used in the scaling animation.
 * @param {Number} windowWidth - The width of the window.
 * @param {Number} xOffset - The distance between the left edge of the window
 *                           and the left edge of the wrapped component.
 * @param {Number} yOffset - The distance between the top edge of the window
 *                           and the top edge of the wrapped component.
 * @param {Number} componentWidth - The width of the wrapped component.
 * @param {Number} componentHeight - The height of the wrapped component.
 * @param {Number} tooltipWidth - The width of the tooltip itself.
 * @param {Number} tooltipHeight - The height of the tooltip itself.
 * @returns {Object}
 */
export default function getTooltipStyles(
    currentSize,
    windowWidth,
    xOffset,
    yOffset,
    componentWidth,
    componentHeight,
    tooltipWidth,
    tooltipHeight,
) {
    // Determine if the tooltip should display below the wrapped component.
    // If a tooltip will try to render within GUTTER_WIDTH logical pixels of the top of the screen,
    // we'll display it beneath its wrapped component rather than above it as usual.
    const shouldShowBelow = (yOffset - tooltipHeight) < GUTTER_WIDTH;

    // Determine if we need to shift the tooltip horizontally to prevent it
    // from displaying too near to the edge of the screen.
    const horizontalShift = computeHorizontalShift(windowWidth, xOffset, componentWidth, tooltipWidth);

    const tooltipVerticalPadding = spacing.pv1;
    const tooltipFontSize = variables.fontSizeSmall;

    return {
        animationStyle: {
            transform: [{
                scale: currentSize,
            }],
        },
        tooltipWrapperStyle: {
            position: 'absolute',
            backgroundColor: themeColors.heading,
            borderRadius: variables.componentBorderRadiusSmall,
            ...tooltipVerticalPadding,
            ...spacing.ph2,

            // Because it uses absolute positioning, the top-left corner of the tooltip is aligned
            // with the top-left corner of the wrapped component by default.
            // So we need to shift the tooltip vertically and horizontally to position it correctly.
            //
            // First, we'll position it vertically.
            // To shift the tooltip down, we'll give `top` a positive value.
            // To shift the tooltip up, we'll give `top` a negative value.
            top: shouldShowBelow

                // We need to shift the tooltip down below the component. So shift the tooltip down (+) by...
                ? componentHeight + POINTER_HEIGHT

                // We need to shift the tooltip up above the component. So shift the tooltip up (-) by...
                : -(tooltipHeight + POINTER_HEIGHT),

            // Next, we'll position it horizontally.
            // To shift the tooltip right, we'll give `left` a positive value.
            // To shift the tooltip left, we'll give `left` a negative value.
            //
            // So we'll:
            //   1) Shift the tooltip right (+) to the center of the component,
            //      so the left edge lines up with the component center.
            //   2) Shift it left (-) to by half the tooltip's width,
            //      so the tooltip's center lines up with the center of the wrapped component.
            //   3) Lastly, we'll add the horizontal shift (left or right) computed above to keep it out of the gutters.
            left: ((componentWidth / 2) - (tooltipWidth / 2)) + horizontalShift,
        },
        tooltipTextStyle: {
            color: themeColors.textReversed,
            fontFamily: fontFamily.GTA,
            fontSize: tooltipFontSize,
        },
        pointerWrapperStyle: {
            position: 'absolute',


            // By default, the pointer's top-left will align with the top-left of the wrapped component.
            //
            // To align it vertically, we'll:
            //   1) Shift the pointer up (-) by its height, so that the bottom of the pointer lines up
            //      with the top of the wrapped component.
            //   2) OR if it should show below, shift the pointer down (+) by the component's height,
            //      so that the top of the pointer aligns with the bottom of the component.
            top: shouldShowBelow ? componentHeight : -POINTER_HEIGHT,

            // To align it horizontally, we'll:
            //   1) Shift the pointer to the right (+) by the half the component's width,
            //      so the left edge of the pointer lines up with the component's center.
            //   2) To the left (-) by half the pointer's width,
            //      so the pointer's center lines up with the component's center.
            left: (componentWidth / 2) - (POINTER_WIDTH / 2),
        },
        pointerStyle: {
            width: 0,
            height: 0,
            backgroundColor: colors.transparent,
            borderStyle: 'solid',
            borderLeftWidth: POINTER_WIDTH / 2,
            borderRightWidth: POINTER_WIDTH / 2,
            borderTopWidth: POINTER_HEIGHT,
            borderLeftColor: colors.transparent,
            borderRightColor: colors.transparent,
            borderTopColor: themeColors.heading,
            ...(shouldShowBelow ? styles.flipUpsideDown : {}),
        },
    };
}
