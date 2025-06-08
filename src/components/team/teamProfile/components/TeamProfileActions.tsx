import React from 'react';
import { View, StyleSheet } from 'react-native';
import FollowButton from '@/src/components/common/FollowButton';
import FollowersCounter from '@/src/components/common/FollowersCount';

type Props = {
    isFollowing: boolean;
    isProcessing: boolean;
    followersCount: number;
    onToggleFollow: () => void;
};

const TeamProfileActions: React.FC<Props> = ({
    isFollowing,
    isProcessing,
    followersCount,
    onToggleFollow,
}) => {
    return (
        <View style={styles.actions}>
            <FollowButton
                isFollowing={isFollowing}
                onPress={onToggleFollow}
                disabled={isProcessing}
            />
            <FollowersCounter count={followersCount} />
        </View>
    );
};

const styles = StyleSheet.create({
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});


export default TeamProfileActions;