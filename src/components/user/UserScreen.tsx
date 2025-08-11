import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { useAppTheme } from '@/src/context/ThemeProvider';
import { useUserContext } from '@/src/context/UserProvider';
import { useAuth0 } from 'react-native-auth0';
import { useSession } from '@/src/context/SessionProvider';
import UsersApi from '@/src/api/UsersApi';

import BottomSheetCustomPage from '../common/BottomSheetCustomPage';
import BottomSheetCustomModal from '../common/BottomSheetCustomModal';
import LegalDocumentScreen from './LegalDocumentScreen';
import UserProfile from './components/UserProfile';
import UserForm from './components/UserForm';
import UserHeader from './components/UserHeader';
import useHasScopes from '@/src/hooks/user/useHasScopes';

type UserProps = {
    onCloseSheet: () => void;
};

const UserScreen: React.FC<UserProps> = ({ onCloseSheet }) => {
    const { refetch, customUser } = useUserContext();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { signOut } = useSession();

    const version = Constants.expoConfig?.version ?? '1.0.0';

    const canEdit = useHasScopes(['update:users']);

    const imprintRef = useRef<BottomSheetModal>(null);
    const termsRef = useRef<BottomSheetModal>(null);
    const privacyRef = useRef<BottomSheetModal>(null);
    const formSheetRef = useRef<BottomSheetModal>(null);

    const openSheet =
        (ref: React.RefObject<BottomSheetModal | null>) => async () => {
            await Haptics.selectionAsync();
            ref.current?.present();
        };

    const closeImprint = () => imprintRef.current?.dismiss();
    const closeTerms = () => termsRef.current?.dismiss();
    const closePrivacy = () => privacyRef.current?.dismiss();

    const openForm = async () => {
        await Haptics.selectionAsync();
        formSheetRef.current?.present();
    };
    const closeForm = () => formSheetRef.current?.dismiss();

    const handleLogout = async () => {
        try {
            await Haptics.selectionAsync();
            await signOut();
        } catch (error) {
            console.log('Erreur lors de la déconnexion :', error);
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Supprimer mon compte',
            'Cette action est irréversible. Es-tu sûr(e) ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            await UsersApi.getInstance().deleteCurrentUser();
                            await signOut();
                        } catch (error) {
                            console.log('Erreur suppression compte :', error);
                        }
                    },
                },
            ]
        );
    };

    if (!customUser) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    }

    const legalItems = [
        { label: 'Mentions légales', onPress: openSheet(imprintRef) },
        { label: "Conditions d'utilisation", onPress: openSheet(termsRef) },
        { label: 'Politique de confidentialité', onPress: openSheet(privacyRef) },
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
            <UserHeader
                title="Profil"
                onEdit={canEdit ? openForm : undefined}
                onCloseSheet={onCloseSheet}
            />

            <UserProfile
                user={customUser}
            />

            <View style={styles.section}>
                {legalItems.map((item) => (
                    <Pressable
                        key={item.label}
                        style={[styles.item, { backgroundColor: theme.surface }]}
                        onPress={item.onPress}
                    >
                        <Text style={[styles.itemText, { color: theme.text }]}>{item.label}</Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.actions}>
                <Pressable
                    style={[styles.logoutButton, { backgroundColor: theme.error }]}
                    onPress={handleLogout}
                >
                    <Text style={[styles.buttonText, { color: theme.text }]}>
                        Se déconnecter
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.deleteButton, { borderColor: theme.error, borderWidth: 1 }]}
                    onPress={handleDeleteAccount}
                >
                    <Text style={[styles.buttonText, { color: theme.error }]}>
                        Supprimer mon compte
                    </Text>
                </Pressable>

                <Pressable style={styles.version} disabled>
                    <Text style={[styles.versionText, { color: theme.textInactive }]}>
                        Version {version}
                    </Text>
                </Pressable>
            </View>

            <BottomSheetCustomPage ref={imprintRef}>
                <LegalDocumentScreen
                    type="imprint"
                    title="Mentions Légales"
                    onCloseSheet={closeImprint}
                />
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={termsRef}>
                <LegalDocumentScreen
                    type="terms"
                    title="Conditions Générales d'Utilisation"
                    onCloseSheet={closeTerms}
                />
            </BottomSheetCustomPage>

            <BottomSheetCustomPage ref={privacyRef}>
                <LegalDocumentScreen
                    type="privacy"
                    title="Politique de Confidentialité"
                    onCloseSheet={closePrivacy}
                />
            </BottomSheetCustomPage>

            <BottomSheetCustomModal ref={formSheetRef}>
                <UserForm
                    user={customUser}
                    onSuccess={async () => {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        refetch();
                        closeForm();
                    }}
                />
            </BottomSheetCustomModal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        gap: 12,
        marginBottom: 32,
    },
    item: {
        padding: 16,
        borderRadius: 16,
    },
    itemText: {
        fontSize: 14,
        fontWeight: '500',
    },
    version: {
        alignItems: 'center',
        marginTop: 4,
    },
    versionText: {
        fontSize: 14,
        fontWeight: '500',
    },
    actions: {
        gap: 12,
    },
    logoutButton: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    deleteButton: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default UserScreen;