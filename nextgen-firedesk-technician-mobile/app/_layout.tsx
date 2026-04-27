import "../global.css";
import { Slot } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import * as Updates from "expo-updates";
import { SafeAreaProvider } from "react-native-safe-area-context";

function UpdateChecker() {
    useEffect(() => {
        if (__DEV__) return; // skip OTA checks in dev

        let cancelled = false;

        (async () => {
            try {
                const update = await Updates.checkForUpdateAsync();
                if (!update.isAvailable) return;

                await Updates.fetchUpdateAsync();
                if (cancelled) return;

                Alert.alert(
                    "Update available",
                    "Restart now to apply the latest changes.",
                    [
                        { text: "Later", style: "cancel" },
                        { text: "Restart now", onPress: () => Updates.reloadAsync() },
                    ],
                );
            } catch (error) {
                console.log("Update check failed", error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}

export default function Layout() {
    return (
        <SafeAreaProvider>
            <UpdateChecker />
            <Slot />
        </SafeAreaProvider>
    );
}
