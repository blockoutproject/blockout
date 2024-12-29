import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const SharedContainer = () => {
    return (
        <View style={styles.parentContainer}>
            {/* Carte 1 */}
            <View style={styles.childContainer}>
                <Text style={styles.text}>Élément 1</Text>
            </View>

            {/* Carte 2 */}
            <View style={styles.childContainer}>
                <Text style={styles.text}>Élément 2</Text>
            </View>

            {/* Carte 3 */}
            <View style={styles.childContainer}>
                <Text style={styles.text}>Élément 3</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    parentContainer: {
    },
    childContainer: {
        height: 175, // Hauteur fixe des enfants
        backgroundColor: '#222', // Fond sombre
        borderRadius: 12, // Coins arrondis
        justifyContent: 'center', // Centre le contenu verticalement
        alignItems: 'center', // Centre le contenu horizontalement
        marginBottom: 10, // Espacement entre les cartes
    },
    text: {
        color: '#fff',
        fontSize: 16,
    },
});

export default SharedContainer;