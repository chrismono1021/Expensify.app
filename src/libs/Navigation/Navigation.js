import React from 'react';
import {StackActions, DrawerActions} from '@react-navigation/native';
import {getIsDrawerOpenFromState} from '@react-navigation/drawer';
import linkTo from './linkTo';
import ROUTES from '../../ROUTES';

export const navigationRef = React.createRef();

/**
 * Opens the LHN drawer.
 * @private
 */
function openDrawer() {
    navigationRef.current.dispatch(DrawerActions.openDrawer());
}

/**
 * @private
 */
function goBack() {
    if (!navigationRef.current.canGoBack()) {
        console.debug('Unable to go back');
        openDrawer();
        return;
    }

    navigationRef.current.goBack();
}

/**
 * Main navigation method for redirecting to a route.
 * @param {String} route
 */
function navigate(route) {
    if (!route) {
        return;
    }

    if (route === ROUTES.HOME) {
        // Don't navigate and just open the drawer
        openDrawer();
        return;
    }

    linkTo(navigationRef.current, route);
}

/**
 * Dismisses a screen presented modally and returns us back to the previous view.
 */
function dismissModal() {
    // This should take us to the first view of the modal's stack navigator
    navigationRef.current.dispatch(StackActions.popToTop());

    // From there we can just navigate back and open the drawer
    goBack();
    openDrawer();
}

function isDrawerOpen() {
    return getIsDrawerOpenFromState(navigationRef.current.getRootState().routes[0].state);
}

export default {
    navigate,
    dismissModal,
    isDrawerOpen,
};
