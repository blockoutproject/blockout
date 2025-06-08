import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        paddingHorizontal: 16,
    },
    header: {
        marginBottom: 10,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    logo: {
        aspectRatio: 1,
        height: 110,
    },
    title: {
        fontWeight: '700',
        fontSize: 20,
        marginBottom: 10,
    },
    infoLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 14,
    },
    linkText: {
        fontSize: 14,
    },
});