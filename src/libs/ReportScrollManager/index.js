import React from 'react';

// This ref is created using React.createRef here because this function is used by a component that doesn't have access
// to the original ref.
const flatListRef = React.createRef();

/**
 * Scroll to the provided index. On non-native implementations we do not want to scroll when we are scrolling because
 * we are editing a comment.
 *
 * @param {Object} index
 * @param {Boolean} isEditing
 */
function scrollToIndex(index, isEditing) {
    if (isEditing) {
        return;
    }

    flatListRef.current.scrollToIndex(index);
}

export {
    flatListRef,
    scrollToIndex,
};
