import React, { Component, ReactNode, ErrorInfo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { logError } from "../lib/logger";
import { LEGAL_URLS } from "../lib/legal";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logError(error, { componentStack: errorInfo.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleContactSupport = () => {
    const errorText = this.state.error?.message || "Unknown error";
    const stackText = this.state.error?.stack || "";
    const body = encodeURIComponent(
      `Hello GyanBlitz Support,\n\nI encountered the following issue while playing:\n\nError: ${errorText}\n\nStack:\n${stackText.substring(0, 1000)}\n\nPlatform: ${Platform.OS} ${Platform.Version}`
    );
    Linking.openURL(`mailto:${LEGAL_URLS.supportEmail}?subject=Crash%20Report&body=${body}`).catch(() => {});
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;

      return (
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.container}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 36 }}>⚡</Text>
            </View>

            <Text style={styles.title}>Oops! Something glitched</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred, but your coins and progress are safe.
            </Text>

            <View style={styles.btnRow}>
              <Pressable onPress={this.handleReset} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Restart Game</Text>
              </Pressable>

              <Pressable
                onPress={this.handleContactSupport}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Email Support</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => this.setState({ showDetails: !this.state.showDetails })}
              style={styles.detailsToggle}
            >
              <Text style={styles.detailsToggleText}>
                {this.state.showDetails ? "Hide Error Details ▲" : "View Error Details ▼"}
              </Text>
            </Pressable>

            {this.state.showDetails && (
              <ScrollView style={styles.detailsBox} showsVerticalScrollIndicator>
                <Text style={styles.detailsText}>
                  {err?.toString() || "Unknown error"}
                </Text>
                {err?.stack && (
                  <Text style={styles.stackText}>{err.stack}</Text>
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#17112E",
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 77, 141, 0.15)",
    borderWidth: 2,
    borderColor: "#FF4D8D",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: "#F1ECFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#A99FD0",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  btnRow: {
    width: "100%",
    maxWidth: 340,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: "#FFC53D",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#3A2700",
    fontWeight: "900",
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: "#221A40",
    borderColor: "#3A2F66",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#A99FD0",
    fontWeight: "800",
    fontSize: 14,
  },
  detailsToggle: {
    marginTop: 24,
    padding: 8,
  },
  detailsToggleText: {
    color: "#A99FD0",
    fontSize: 12,
    fontWeight: "700",
  },
  detailsBox: {
    marginTop: 12,
    maxHeight: 180,
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0F0A1C",
    borderColor: "#3A2F66",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  detailsText: {
    color: "#FF5C5C",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  stackText: {
    color: "#A99FD0",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 10,
    lineHeight: 14,
  },
});
