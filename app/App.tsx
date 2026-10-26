import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useGame } from "./src/state/store";
import SplashScreen from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import HomeScreen from "./src/screens/HomeScreen";
import HowToScreen from "./src/screens/HowToScreen";
import StoreScreen from "./src/screens/StoreScreen";
import ModeScreen from "./src/screens/ModeScreen";
import FriendsScreen from "./src/screens/FriendsScreen";
import LobbyScreen from "./src/screens/LobbyScreen";
import MatchScreen from "./src/screens/MatchScreen";
import ResultScreen from "./src/screens/ResultScreen";
import FriendsResultScreen from "./src/screens/FriendsResultScreen";
import ReviewScreen from "./src/screens/ReviewScreen";
import LeagueScreen from "./src/screens/LeagueScreen";
import LockerScreen from "./src/screens/LockerScreen";
import SeasonPassScreen from "./src/screens/SeasonPassScreen";
import { initSfx } from "./src/lib/sfx";
import { useThemeC } from "./src/theme";
import ErrorBoundary from "./src/components/ErrorBoundary";

export default function App() {
  const screen = useGame((s) => s.screen);
  const init = useGame((s) => s.init);
  const goHome = useGame((s) => s.goHome);
  const C = useThemeC();
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    init();
    initSfx();
  }, [init]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary onReset={goHome}>
        <StatusBar style={C.mode === "dark" ? "light" : "dark"} />
        <LinearGradient colors={C.bg} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.bg}>
          <View style={styles.app}>
            {splash ? (
              <SplashScreen onDone={() => setSplash(false)} />
            ) : (
              <>
                {screen === "loading" && (
                  <View style={styles.center}>
                    <ActivityIndicator color={C.accent} size="large" />
                  </View>
                )}
                {screen === "onboarding" && <OnboardingScreen />}
                {screen === "home" && <HomeScreen />}
                {screen === "howto" && <HowToScreen />}
                {screen === "store" && <StoreScreen />}
                {screen === "modes" && <ModeScreen />}
                {screen === "friends" && <FriendsScreen />}
                {screen === "lobby" && <LobbyScreen />}
                {screen === "match" && <MatchScreen />}
                {screen === "result" && <ResultScreen />}
                {screen === "friendsResult" && <FriendsResultScreen />}
                {screen === "review" && <ReviewScreen />}
                {screen === "league" && <LeagueScreen />}
                {screen === "locker" && <LockerScreen />}
                {screen === "pass" && <SeasonPassScreen />}
              </>
            )}
          </View>
        </LinearGradient>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  app: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
