import styles from '../../../styles/styles';

const pickerStyles = (disabled, error, focused) => ({
    ...styles.expensiPicker(disabled, error, focused),
    inputAndroid: styles.expensiPicker(disabled, error, focused).inputNative,
});

export default pickerStyles;
