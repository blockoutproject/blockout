import React from 'react';
import { View } from 'react-native';
import FollowButton from '@/src/components/common/FollowButton';
import FollowersCounter from '@/src/components/common/FollowersCount';
import teamProfileStyles from '../teamProfileStyles';

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
        <View style={teamProfileStyles.actions}>
            <FollowButton
                isFollowing={isFollowing}
                onPress={onToggleFollow}
                disabled={isProcessing}
            />
            <FollowersCounter count={followersCount} />
        </View>
    );
};

export default TeamProfileActions;