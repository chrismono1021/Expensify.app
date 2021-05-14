import React from 'react';
import {View} from 'react-native';

import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import Navigation from '../../libs/Navigation/Navigation';
import ROUTES from '../../ROUTES';
import CONST from '../../CONST';
import {
    Android, Apple, NewWindow,
} from '../../components/Icon/Expensicons';
import ScreenWrapper from '../../components/ScreenWrapper';
import withLocalize, {
    withLocalizePropTypes,
} from '../../components/withLocalize';
import compose from '../../libs/compose';
import MenuItem from '../../components/MenuItem';
import openURLInNewTab from '../../libs/openURLInNewTab';

const propTypes = {
    ...withLocalizePropTypes,
};

const defaultProps = {

};

const PreferencesPage = ({translate}) => {
    const menuItems = [
        {
            translationKey: 'initialSettingsPage.appDownloadLinks.android.label',
            icon: Android,
            action: () => {
                openURLInNewTab(CONST.APP_DOWNLOAD_LINKS.ANDROID);
            },
        },
        {
            translationKey: 'initialSettingsPage.appDownloadLinks.ios.label',
            icon: Apple,
            action: () => {
                openURLInNewTab(CONST.APP_DOWNLOAD_LINKS.IOS);
            },
        },
        {
            translationKey: 'initialSettingsPage.appDownloadLinks.desktop.label',
            icon: NewWindow,
            action: () => {
                openURLInNewTab(CONST.APP_DOWNLOAD_LINKS.DESKTOP);
            },
        },

    ];

    return (
        <ScreenWrapper>
            <HeaderWithCloseButton
                title={translate('initialSettingsPage.aboutPage.appDownloadLinks')}
                shouldShowBackButton
                onBackButtonPress={() => Navigation.navigate(ROUTES.SETTINGS_ABOUT)}
                onCloseButtonPress={() => Navigation.dismissModal(true)}
            />
            <View style={[{marginTop: 20}]}>
                {menuItems.map(item => (
                    <MenuItem
                        key={item.title}
                        title={translate(item.translationKey)}
                        icon={item.icon}
                        onPress={() => item.action()}
                        shouldShowRightArrow
                    />
                ))}
            </View>
        </ScreenWrapper>
    );
};

PreferencesPage.propTypes = propTypes;
PreferencesPage.defaultProps = defaultProps;
PreferencesPage.displayName = 'PreferencesPage';

export default compose(
    withLocalize,

)(PreferencesPage);
