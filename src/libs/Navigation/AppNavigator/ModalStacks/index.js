import createCustomModalStackNavigator from '../createCustomModalStackNavigator';

// Setup the modal stack navigators so we only have to create them once
const SettingsModalStack = createCustomModalStackNavigator();
const NewChatModalStack = createCustomModalStackNavigator();
const NewGroupModalStack = createCustomModalStackNavigator();
const SearchModalStack = createCustomModalStackNavigator();
const DetailsModalStack = createCustomModalStackNavigator();
const IOURequestModalStack = createCustomModalStackNavigator();
const IOUBillModalStack = createCustomModalStackNavigator();

export {
    SettingsModalStack,
    NewChatModalStack,
    NewGroupModalStack,
    SearchModalStack,
    DetailsModalStack,
    IOURequestModalStack,
    IOUBillModalStack,
};
