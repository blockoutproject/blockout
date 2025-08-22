import React from "react";
import { View } from "react-native";
import { Skeleton } from "@/src/components/common/Skeleton";

type Props = {
    size: number;
    radius: number;
};

const MaskedImageSkeleton: React.FC<Props> = ({ size, radius }) => {
    return (
        <View
            pointerEvents="none"
            style={{
                position: "absolute",
                inset: 0,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Skeleton width={size} height={size} style={{ borderRadius: radius }} />
        </View>
    );
};

export default MaskedImageSkeleton;