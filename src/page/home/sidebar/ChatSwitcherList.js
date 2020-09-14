import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import {
    Image,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import styles from '../../../style/StyleSheet';
import CONFIG from '../../../CONFIG';

const propTypes = {
    // The index of the option that is currently in focus
    focusedIndex: PropTypes.number.isRequired,

    // An array of options to allow the user to choose from
    options: PropTypes.arrayOf(PropTypes.shape({
        // The full name of the user if available
        text: PropTypes.string.isRequired,

        // The login (email/phone number) of the user, or the name of the chat room
        alternateText: PropTypes.string.isRequired,

        // The URL of the person's avatar
        avatarURL: PropTypes.string,
    })),

    // A function that is called when an option is selected. Selected option is passed as a param
    onSelect: PropTypes.func.isRequired,
};
const defaultProps = {
    options: [],
};

const ChatSwitcherList = ({focusedIndex, options, onSelect}) => (
    <View style={[styles.chatSwitcherItemList]}>
        {options.length > 0 && _.map(options, (option, i) => {
            const optionIsFocused = i === focusedIndex;
            const textStyle = optionIsFocused
                ? styles.sidebarLinkActiveText
                : styles.sidebarLinkText;
            const avatarURL = option.avatarURL ? option.avatarURL : CONFIG.FAVICON.DEFAULT;
            return (
                <TouchableOpacity
                    key={option.alternateText}
                    onPress={() => onSelect(option)}
                >
                    <View
                        style={[
                            styles.flexRow,
                            styles.mb2,
                            styles.alignItemsCenter,
                            styles.chatSwitcherItem,
                            optionIsFocused ? styles.chatSwitcherItemFocused : null
                        ]}
                    >
                        <View style={[styles.chatSwitcherAvatar, styles.mr2]}>
                            <Image
                                source={{uri: avatarURL}}
                                style={[styles.chatSwitcherAvatarImage]}
                            />
                        </View>
                        <View style={[styles.flex1]}>
                            {option.text === '' ? (
                                <Text style={[textStyle, styles.h3]} numberOfLines={1}>
                                    {option.alternateText}
                                </Text>
                            ) : (
                                <>
                                    <Text style={[textStyle, styles.h3]} numberOfLines={1}>
                                        {option.text}
                                    </Text>
                                    <Text style={[textStyle, styles.textMicro]} numberOfLines={1}>
                                        {option.alternateText}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            );
        })}
    </View>
);

ChatSwitcherList.propTypes = propTypes;
ChatSwitcherList.defaultProps = defaultProps;
ChatSwitcherList.displayName = 'ChatSwitcherList';

export default ChatSwitcherList;
