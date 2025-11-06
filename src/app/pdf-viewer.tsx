import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Animated } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import PdfViewerHeader from "../components/pdfViewer/PdfViewerHeader";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import ReportFormSheet from "../components/report/ReportFormSheet";
import { ReportType } from "../types/Report";

export default function PdfViewer() {
    const params = useLocalSearchParams<{ url: string; title?: string }>();
    const url = params.url as string;
    const title = (params.title as string) ?? "Document";
    const reportSheetRef = useRef<BottomSheetModal>(null);

    const [loading, setLoading] = useState(true);
    const opacity = useRef(new Animated.Value(0)).current;

    const viewerUrl = useMemo(() => {
        const encoded = encodeURIComponent(url);
        return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encoded}`;
    }, [url]);

    const handleProgress = (p: number) => {
        if (p >= 0.2) {
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
                setLoading(false);
            });
        }
    };

    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    return (
        <View style={styles.container}>
            <PdfViewerHeader title={title} onOpenReport={handleOpenReport} />
            <View style={{ flex: 1 }}>
                <WebView
                    source={{ uri: viewerUrl }}
                    originWhitelist={["*"]}
                    onLoadStart={() => { setLoading(true); opacity.setValue(0); }}
                    onLoadProgress={({ nativeEvent }) => handleProgress(nativeEvent.progress ?? 0)}
                    onLoadEnd={() => handleProgress(1)}
                    startInLoadingState={false}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsLinkPreview
                    allowFileAccess
                    allowUniversalAccessFromFileURLs
                    overScrollMode="never"
                />

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator />
                    </View>
                )}
            </View>
            <ReportFormSheet
                ref={reportSheetRef}
                context={{ screen: "PDF Viewer", defaultType: ReportType.DISPLAY_BUG }}
                onSuccess={() => {
                    reportSheetRef.current?.dismiss();
                }}
                snapPoint="90%"
                footerLabel="Envoyer"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
    },
    webviewWrap: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "black",
        alignItems: "center",
        justifyContent: "center",
    },
});