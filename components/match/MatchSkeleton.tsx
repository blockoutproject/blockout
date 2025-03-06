import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { colors } from '@/constants/Colors';

const MatchSkeleton: React.FC = () => {
    return (
        <View style={styles.screen}>
            {/* Ce View prend toute la hauteur (flex: 1). */}
            <ScrollView
                style={styles.scroll}                     // Donne flex:1 au ScrollView lui-même
                contentContainerStyle={styles.scrollContent} // Assure que le contenu s'étale sur tout l'espace
            >
                <SkeletonPlaceholder
                    backgroundColor={colors.grey}
                    highlightColor={colors.lightGrey}
                    speed={800}
                    borderRadius={8}
                >
                    <SkeletonPlaceholder.Item>
                        {/* 1) Bloc pour la carte du Score */}
                        <SkeletonPlaceholder.Item
                            height={140}
                            borderRadius={12}
                            marginBottom={16}
                        />

                        {/* 2) Bloc pour la carte d’Informations */}
                        <SkeletonPlaceholder.Item
                            height={200}
                            borderRadius={12}
                            marginBottom={16}
                        />

                        {/* 3) Bloc pour la carte du Classement */}
                        <SkeletonPlaceholder.Item
                            height={300}
                            borderRadius={12}
                            marginBottom={32}
                        />
                    </SkeletonPlaceholder.Item>
                </SkeletonPlaceholder>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 16,
    },
});

export default MatchSkeleton;