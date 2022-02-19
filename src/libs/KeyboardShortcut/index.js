import _ from 'underscore';
import lodashGet from 'lodash/get';
import Str from 'expensify-common/lib/str';
import getOperatingSystem from '../getOperatingSystem';
import CONST from '../../CONST';

const eventHandlers = {};
const keyboardShortcutMap = {};

/**
 * Return the key-value pair for shortcut keys and translate keys
 * @returns {Array}
 */
function getKeyboardShortcuts() {
    return _.values(keyboardShortcutMap);
}

/**
 * Checks if an event for that key is configured and if so, runs it.
 * @param {Event} event
 * @private
 */
function bindHandlerToKeydownEvent(event) {
    const correctedKey = event.key.toLowerCase();

    if (eventHandlers[correctedKey] === undefined) {
        return;
    }

    _.every(eventHandlers[correctedKey], (callback) => {
        const pressedModifiers = _.all(callback.modifiers, (modifier) => {
            if (modifier === 'shift' && !event.shiftKey) {
                return false;
            }
            if (modifier === 'control' && !event.ctrlKey) {
                return false;
            }
            if (modifier === 'alt' && !event.altKey) {
                return false;
            }
            if (modifier === 'meta' && !event.metaKey) {
                return false;
            }
            return true;
        });

        const extraModifiers = _.difference(['shift', 'control', 'alt', 'meta'], callback.modifiers);

        // returns true if extra modifiers are pressed
        const pressedExtraModifiers = _.some(extraModifiers, (extraModifier) => {
            if (extraModifier === 'shift' && event.shiftKey) {
                return true;
            }
            if (extraModifier === 'control' && event.ctrlKey) {
                return true;
            }
            if (extraModifier === 'alt' && event.altKey) {
                return true;
            }
            if (extraModifier === 'meta' && event.metaKey) {
                return true;
            }
            return false;
        });
        if (!pressedModifiers || pressedExtraModifiers) {
            return true;
        }

        // If configured to do so, prevent input text control to trigger this event
        if (!callback.captureOnInputs && (
            event.target.nodeName === 'INPUT'
            || event.target.nodeName === 'TEXTAREA'
            || event.target.contentEditable === 'true'
        )) {
            return true;
        }

        if (_.isFunction(callback.callback)) {
            callback.callback(event);
        }
        event.preventDefault();

        // If the event should not bubble, short-circuit the loop
        let shouldBubble = callback.shouldBubble || false;
        if (_.isFunction(callback.shouldBubble)) {
            shouldBubble = callback.shouldBubble();
        }
        return shouldBubble;
    });
}

// Make sure we don't add multiple listeners
document.removeEventListener('keydown', bindHandlerToKeydownEvent, {capture: true});
document.addEventListener('keydown', bindHandlerToKeydownEvent, {capture: true});

/**
 * Unsubscribes a keyboard event handler.
 *
 * @param {String} key The key to stop watching
 * @param {String} callbackID The specific ID given to the callback at the time it was added
 * @private
 */
function unsubscribe(key, callbackID) {
    eventHandlers[key] = _.filter(eventHandlers[key], callback => callback.id !== callbackID);
}

/**
 * Add key to the shortcut map
 *
 * @param {String} key The key to watch, i.e. 'K' or 'Escape'
 * @param {String|String[]} modifiers Can either be shift or control
 * @param {String} descriptionKey Translation key for shortcut description
 */
function addKeyToMap(key, modifiers, descriptionKey) {
    let displayName = [key];
    if (_.isString(modifiers)) {
        displayName.unshift(modifiers);
    } else if (_.isArray(modifiers)) {
        displayName = [...modifiers, ...displayName];
    }

    displayName = _.map(displayName, modifier => lodashGet(CONST.KEYBOARD_SHORTCUT_KEY_DISPLAY_NAME, modifier.toUpperCase(), modifier));

    displayName = displayName.join(' + ');
    keyboardShortcutMap[displayName] = {
        shortcutKey: key,
        descriptionKey,
        displayName,
        modifiers,
    };
}

/**
 * Subscribes to a keyboard event.
 * @param {String} key The key to watch, i.e. 'K' or 'Escape'
 * @param {Function} callback The callback to call
 * @param {String} descriptionKey Translation key for shortcut description
 * @param {String|Array} modifiers Can either be shift or control
 * @param {Boolean} captureOnInputs Should we capture the event on inputs too?
 * @param {Boolean|Function} shouldBubble Should the event bubble?
 * @param {Number} priority The position the callback should take in the stack. 0 means top priority, and 1 means less priority than the most recently added.
 * @returns {Function} clean up method
 */
function subscribe(key, callback, descriptionKey, modifiers = 'shift', captureOnInputs = false, shouldBubble = false, priority = 0) {
    const correctedKey = key.toLowerCase();
    if (eventHandlers[correctedKey] === undefined) {
        eventHandlers[correctedKey] = [];
    }
    const callbackID = Str.guid();
    eventHandlers[correctedKey].splice(priority, 0, {
        id: callbackID,
        callback,
        modifiers: _.isArray(modifiers) ? modifiers : [modifiers],
        captureOnInputs,
        shouldBubble,
    });

    if (descriptionKey) {
        addKeyToMap(key, modifiers, descriptionKey);
    }
    return () => unsubscribe(correctedKey, callbackID);
}

/**
 * Return platform specific modifiers for keys like Control (Cmd)
 * @param {Array} modifiers
 * @returns {Array}
 */
function getShortcutModifiers(modifiers) {
    const operatingSystem = getOperatingSystem();
    return _.map(modifiers, (modifier) => {
        if (!_.has(CONST.KEYBOARD_SHORTCUT_MODIFIERS, modifier)) {
            return modifier;
        }

        const platformModifiers = CONST.KEYBOARD_SHORTCUT_MODIFIERS[modifier];
        return lodashGet(platformModifiers, operatingSystem, platformModifiers.DEFAULT || modifier);
    });
}

/**
 * Module storing the different keyboard shortcut
 *
 * We are using a push/pop model where new event are pushed at the end of an
 * array of events. When the event occur, we trigger the callback of the last
 * element. This allow us to replace shortcut from a page to a dialog without
 * having the page having to handle that logic.
 *
 * This is also following the convention of the PubSub module.
 * The "subClass" is used by pages to bind /unbind with no worries
 */
const KeyboardShortcut = {
    subscribe,
    getKeyboardShortcuts,
    getShortcutModifiers,
};

export default KeyboardShortcut;
