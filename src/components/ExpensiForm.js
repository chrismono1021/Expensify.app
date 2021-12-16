import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import * as FormAction from '../libs/actions/ExpensiForm';
import {ScrollView, View} from 'react-native';
import styles from '../styles/styles';

const propTypes = {
    name: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,

    // eslint-disable-next-line react/forbid-prop-types
    defaultValues: PropTypes.object,
    // eslint-disable-next-line react/forbid-prop-types
    serverErrors: PropTypes.object,

    validate: PropTypes.func.isRequired,
    saveDraft: PropTypes.bool,
};

const defaultProps = {
    defaultValues: {},
    serverErrors: {},
    saveDraft: true,
};

class ExpensiForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            defaultValues: this.props.defaultValues,
            errors: {},
            serverErrors: {},
        };
        this.inputRefs = React.createRef();
        this.inputRefs.current = {};

        this.getFormValues = this.getFormValues.bind(this);
        this.saveDraft = this.saveDraft.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        this.validate = this.validate.bind(this);
        this.clearInputErrors = this.clearInputErrors.bind(this);
        this.setLoading = this.setLoading.bind(this);
        this.setServerError = this.setServerError.bind(this);
    }

    getFormValues() {
        const formData = {};
        _.each(_.keys(this.inputRefs.current), (key) => {
            formData[key] = this.inputRefs.current[key].value;
        });
        return formData;
    }

    saveDraft(draft) {
        if (!this.props.saveDraft) {
            return;
        }
        FormAction.saveFormDraft(`${this.props.name}_draft`, {...draft});
    }

    validate(field) {
        const values = this.getFormValues();
        // validate takes in form values and returns errors object in the format
        // {username: 'form.errors.required', name: 'form.errors.tooShort', ...}
        // how do we handle multiple errors in this case???

        // We check if we are trying to validate a single field or the entire form
        const errors = this.props.validate(values);
        if (field) {
            this.setState(prevState => ({
                errors: {
                    ...prevState.errors,
                    [field]: errors[field]
                }
            }));
        } else {
            this.setState({serverErrors: 'There were errors submitting the form', errors});
        }
        return errors;
    }

    // Should be called onFocus
    clearInputErrors(field) {
        this.setState(prevState => ({
            errors: {
                ...prevState.errors,
                [field]: undefined,
            },
        }));
    }

    setLoading(value) {
        this.setState({isLoading: value})
    }

    setServerError(value) {
        this.setState({serverError: value});
    }

    onSubmit() {
        const values = this.getFormValues();
        const errors = this.validate();
        if (!_.isEmpty(errors)) {
            return;
        }
        this.props.onSubmit(values, {setLoading: this.setLoading, setServerError: this.setServerError})
    }

    render() {
        const childrenWrapperWithProps = children => (
            React.Children.map(children, (child) => {
                // Do nothing if child is not a valid React element
                if (!React.isValidElement(child)) {
                    return child;
                }

                // Depth first traversal of the render tree as the form element is likely to be the last node
                if (child.props.children) {
                    child = React.cloneElement(child, {
                        children: childrenWrapperWithProps(child.props.children),
                    });
                }

                // We check if the component has the EXPENSIFORM static property enabled,
                // as we don't want to pass form props to non form components, e.g. View, Text, etc
                if (!child.type.EXPENSIFORM) {
                    return child;
                }


                // We clone the child passing down all form props
                const inputRef = node => this.inputRefs.current[child.props.name] = node;
                return React.cloneElement(child, {
                    ref: inputRef,
                    saveDraft: this.saveDraft,
                    validate: this.validate,
                    clearInputErrors: this.clearInputErrors,
                    onSubmit: this.onSubmit,
                    defaultValue: this.state.defaultValues[child.props.name],
                    error: this.state.errors[child.props.name],
                    serverError: this.state.serverError,
                    isLoading: this.state.isLoading,
                });
            })
        );

        return (
            <>
                <ScrollView
                    style={[styles.w100, styles.flex1]}
                    contentContainerStyle={styles.flexGrow1}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Form elements */}
                    <View style={[this.props.style]}>
                        {childrenWrapperWithProps(this.props.children)}
                    </View>
                </ScrollView>
            </>
        );
    }
}

ExpensiForm.propTypes = propTypes;
ExpensiForm.defaultProps = defaultProps;

export default ExpensiForm;