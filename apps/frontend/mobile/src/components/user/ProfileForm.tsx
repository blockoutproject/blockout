import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/context/ThemeProvider';
import { CORNERS } from '@/src/theme/globals';
import { CustomUser } from '@/src/types/User';
import ApiErrorToast from '@/src/components/common/feedback/ApiErrorToast';

import FormCard from '@/src/components/common/form/FormCard';
import Field from '@/src/components/common/form/Field';
import SheetTextInput from '@/src/components/common/form/SheetTextInput';
import { ApiError } from '@/src/api/core/ApiError';
import { CustomImage } from '@/src/types/Common';
import { updateMobileUser } from '@/src/api/generated/mobile-gateway/endpoints/mobile-users/mobile-users';
import {
  UpdateMobileUserBody,
  UpdateMobileUserParams,
  UpdateMobileUserResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-users/mobile-users.zod';
import { toOrvalMultipartFile } from '@/src/api/core/reactNativeMultipart';
import { toCustomUser } from '@/src/hooks/user/userView';

export type ProfileFormExternalState = {
  loading: boolean;
  canSubmit: boolean;
};

export type UserFormProps = {
  user: CustomUser;
  onSuccess: (updated: CustomUser) => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: ProfileFormExternalState) => void;
};

const ProfileForm: React.FC<UserFormProps> = ({
  user,
  onSuccess,
  onRegisterSubmit,
  onStateChange,
}) => {
  const theme = useAppTheme();

  const [imageFile, setImageFile] = useState<CustomImage | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [removedAvatar, setRemovedAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      await Haptics.selectionAsync();
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (pickerResult.canceled) return;

      const asset = pickerResult.assets[0];
      if (!asset?.uri) return;

      const manipContext = ImageManipulator.ImageManipulator.manipulate(
        asset.uri,
      );
      manipContext.resize({ width: 512 });
      const rendered = await manipContext.renderAsync();
      const saved = await rendered.saveAsync({
        format: ImageManipulator.SaveFormat.PNG,
        compress: 1,
      });

      setPreviewUri(saved.uri);
      setImageFile({ uri: saved.uri, name: 'avatar.png', type: 'image/png' });
      setRemovedAvatar(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de traiter l’image.');
    }
  };

  const handleRemoveImage = async () => {
    await Haptics.selectionAsync();
    setPreviewUri(null);
    setImageFile(null);
    setRemovedAvatar(true);
  };

  const formik = useFormik({
    initialValues: { pseudo: user.pseudo ?? '' },
    validationSchema: Yup.object({
      pseudo: Yup.string()
        .required("Je s'appelle Groot 🌳")
        .min(3, 'Min. 3 caractères')
        .max(32, 'Max. 32 caractères')
        .matches(/^[a-zA-Z0-9._-]+$/, 'Lettres, chiffres, ., -, _ uniquement'),
    }),
    onSubmit: async (values) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setApiError(null);

        const trimmed = values.pseudo.trim();
        const path = UpdateMobileUserParams.parse({
          auth0Id: user.auth0Id,
        });
        const response = await updateMobileUser(path.auth0Id, {
          data: UpdateMobileUserBody.shape.data.parse({
            pseudo: trimmed !== user.pseudo ? trimmed : undefined,
            removePicture: removedAvatar,
          }),
          image: imageFile ? toOrvalMultipartFile(imageFile) : undefined,
        });
        const updated = toCustomUser(UpdateMobileUserResponse.parse(response));
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess(updated);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const serverMsg =
            (err.data &&
              ((err.data as any).message || (err.data as any).error)) ||
            'Ce pseudo est déjà utilisé.';
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
          formik.setFieldError('pseudo', serverMsg);
          setApiError(null);
        } else {
          setApiError('Sauvegarde impossible, réessaie.');
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
        }
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    onRegisterSubmit(formik.submitForm);
  }, [formik.submitForm, onRegisterSubmit]);

  const canSubmit = useMemo(
    () => formik.isValid && !loading,
    [formik.isValid, loading],
  );

  useEffect(() => {
    onStateChange?.({ loading, canSubmit });
  }, [loading, canSubmit, onStateChange]);

  const avatarUri = removedAvatar
    ? null
    : (previewUri ?? user.pictureUrl ?? null);

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.fieldContainer}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      >
        <FormCard title="Photo de profil">
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.85}
            style={[styles.logoWrap, { borderColor: theme.border }]}
          >
            <View style={styles.logoMask}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.logo}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialCommunityIcons
                    name="camera-plus-outline"
                    size={28}
                    color={theme.textInactive}
                  />
                  <Text
                    style={[styles.logoHint, { color: theme.textInactive }]}
                  >
                    Ajouter une photo
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={[
                styles.logoBtn,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color={theme.text}
              />
              <Text style={[styles.logoBtnText, { color: theme.text }]}>
                Changer la photo
              </Text>
            </TouchableOpacity>

            {avatarUri && (
              <TouchableOpacity
                onPress={handleRemoveImage}
                style={[
                  styles.removeBtn,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={16}
                  color={theme.error}
                />
                <Text style={[styles.removeBtnText, { color: theme.error }]}>
                  Supprimer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </FormCard>

        <FormCard>
          <Field
            label="Pseudo"
            error={formik.errors.pseudo}
            touched={formik.touched.pseudo}
          >
            <SheetTextInput
              value={formik.values.pseudo}
              onChangeText={formik.handleChange('pseudo')}
              onBlur={formik.handleBlur('pseudo')}
              placeholder="Ton pseudo"
              autoCapitalize="none"
              returnKeyType="done"
              style={
                formik.touched.pseudo && formik.errors.pseudo
                  ? { borderColor: theme.error }
                  : undefined
              }
            />
          </Field>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default ProfileForm;

const styles = StyleSheet.create({
  fieldContainer: { padding: 8, paddingBottom: 100, gap: 12 },
  logoWrap: {
    borderWidth: 1.5,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoMask: {
    width: 110,
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: { alignItems: 'center', gap: 6 },
  logoHint: { fontSize: 12, fontWeight: '600' },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CORNERS,
  },
  logoBtnText: { fontSize: 12, fontWeight: '700' },
  removeBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CORNERS,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
