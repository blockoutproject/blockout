import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Linking,
    TouchableOpacity,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAppTheme } from '@/src/context/ThemeProvider';
import type { Club } from '@/src/types/Club';
import { useHasScopes } from '@/src/hooks/user/useHasScope';

type Props = {
    club: Club;
    onEdit: () => void;
};

const ClubProfile: React.FC<Props> = ({ club, onEdit }) => {
    const theme = useAppTheme();

    const canUpdateClub = useHasScopes([
        "update:clubs",
    ]);

    const openWebsite = () => {
        if (club.website) {
            Linking.openURL(
                club.website.startsWith('http') ? club.website : `https://${club.website}`,
            );
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {canUpdateClub && (
                <TouchableOpacity
                    style={styles.editIcon}
                    onPress={onEdit}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="edit" size={22} color={theme.text} />
                </TouchableOpacity>
            )}

            <View style={styles.row}>
                <FastImage
                    source={
                        club.logoUrl
                            ? { uri: club.logoUrl }
                            : require('@/assets/clubs/default_club_logo.png')
                    }
                    style={[styles.logo, { backgroundColor: theme.text }]}
                    resizeMode="contain"
                />

                <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.text }]}>{club.name}</Text>

                    {club.city && (
                        <InfoLine icon="map-marker" text={club.city} />
                    )}

                    {club.email && (
                        <InfoLine icon="email-outline" text={club.email} />
                    )}

                    {club.phoneNumber && (
                        <InfoLine icon="phone-outline" text={club.phoneNumber} />
                    )}

                    {club.website && (
                        <InfoLine
                            icon="link-variant"
                            text={club.website.replace(/^https?:\/\//, '')}
                            onPress={openWebsite}
                            link
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

const InfoLine = ({
    icon,
    text,
    onPress,
    link,
}: {
    icon: any;
    text: string;
    onPress?: () => void;
    link?: boolean;
}) => {
    const theme = useAppTheme();
    const Comp = onPress ? TouchableOpacity : View;

    return (
        <Comp style={styles.infoLine} onPress={onPress} activeOpacity={0.7}>
            <MaterialCommunityIcons name={icon} size={18} color={theme.text} />
            <Text
                style={[
                    styles.infoText,
                    { color: link ? theme.primary : theme.text },
                    link && styles.underline,
                ]}
            >
                {text}
            </Text>
        </Comp>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
        paddingHorizontal: 16,
    },
    editIcon: {
        alignSelf: 'flex-end',
        marginBottom: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    logo: {
        width: 100,
        borderRadius: 18,
        aspectRatio: 1,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
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
    underline: {
        textDecorationLine: 'underline'
    },
});

export default ClubProfile;