import React, {Component} from 'react';
import {
    Animated, TextInput,
} from 'react-native';
import ExpensiTextInputWrapper from './ExpensiTextInputWrapper';
import ExpensiTextInputLabel from './ExpensiTextInputLabel';
import expensiTextInputPropTypes from './ExpensiTextInputPropTypes';
import expensiTextInputDefaultProps from './ExpensiTextInputDefaultProps';
import styles from '../../styles/styles';
import themeColors from '../../styles/themes/default';

const ACTIVE_LABEL_TRANSLATE_Y = -10;
const ACTIVE_LABEL_TRANSLATE_X = (fullWidth = true) => (fullWidth ? -22 : -10);
const ACTIVE_LABEL_SCALE = 0.8668;

const INACTIVE_LABEL_TRANSLATE_Y = 0;
const INACTIVE_LABEL_TRANSLATE_X = 0;
const INACTIVE_LABEL_SCALE = 1;

class ExpensiTextInput extends Component {
    constructor(props) {
        super(props);

        const hasValue = props.value.length > 0;

        this.state = {
            isFocused: false,
            labelTranslateY: new Animated.Value(hasValue ? ACTIVE_LABEL_TRANSLATE_Y : INACTIVE_LABEL_TRANSLATE_Y),
            labelTranslateX: new Animated.Value(hasValue
                ? ACTIVE_LABEL_TRANSLATE_X(props.fullWidth) : INACTIVE_LABEL_TRANSLATE_X),
            labelScale: new Animated.Value(hasValue ? ACTIVE_LABEL_SCALE : INACTIVE_LABEL_SCALE),
        };

        this.input = null;
    }

    animateLabel = (translateY, translateX, scale) => {
        Animated.parallel([
            Animated.spring(this.state.labelTranslateY, {
                toValue: translateY,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.spring(this.state.labelTranslateX, {
                toValue: translateX,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.spring(this.state.labelScale, {
                toValue: scale,
                duration: 80,
                useNativeDriver: true,
            }),
        ]).start();
    }

    onFocus = () => {
        if (this.props.onFocusExtra) { this.props.onFocusExtra(); }
        this.setState({isFocused: true});
        if (this.props.value.length === 0) {
            this.animateLabel(
                ACTIVE_LABEL_TRANSLATE_Y,
                ACTIVE_LABEL_TRANSLATE_X(this.props.fullWidth),
                ACTIVE_LABEL_SCALE,
            );
        }
    }

    onBlur = () => {
        if (this.props.onBlurExtra) { this.props.onBlurExtra(); }
        this.setState({isFocused: false});
        if (this.props.value.length === 0) {
            this.animateLabel(INACTIVE_LABEL_TRANSLATE_Y, INACTIVE_LABEL_TRANSLATE_X, INACTIVE_LABEL_SCALE);
        }
    }

    focus = () => this.input.focus()

    render() {
        const {
            label, value, placeholder, error, containerStyles, ...inputProps
        } = this.props;
        const {
            isFocused, labelTranslateY, labelTranslateX, labelScale,
        } = this.state;

        const hasLabel = !!label.length;
        return (
            <ExpensiTextInputWrapper
                containerStyles={containerStyles}
                isFocused={isFocused}
                error={error}
                onPress={this.focus}
                hasLabel={hasLabel}
            >
                <>
                    {hasLabel ? (
                        <ExpensiTextInputLabel
                            label={label}
                            labelTranslateX={labelTranslateX}
                            labelTranslateY={labelTranslateY}
                            labelScale={labelScale}
                        />
                    ) : null}
                    <TextInput
                        ref={ref => this.input = ref}
                        value={value}
                        onFocus={this.onFocus}
                        onBlur={this.onBlur}
                        placeholder={isFocused || !label ? placeholder : null}
                        placeholderTextColor={themeColors.placeholderText}
                        style={styles.expensiTextInput}
                                // eslint-disable-next-line react/jsx-props-no-spreading
                        {...inputProps}
                    />
                </>
            </ExpensiTextInputWrapper>
        );
    }
}

ExpensiTextInput.propTypes = expensiTextInputPropTypes;
ExpensiTextInput.defaultProps = expensiTextInputDefaultProps;

export default ExpensiTextInput;
