import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useThemeC, type Palette } from "../theme";
import { getRazorpayCheckoutHtml, RAZORPAY_KEY_ID } from "../lib/razorpay";

interface RazorpayModalProps {
  visible: boolean;
  packName: string;
  amountInr: number;
  orderId?: string | null;
  keyId?: string | null;
  username: string;
  onSuccess: (payment: {
    paymentId: string;
    orderId?: string | null;
    signature?: string | null;
  }) => void;
  onCancel: () => void;
  onFailure: (reason: string) => void;
}

export default function RazorpayModal({
  visible,
  packName,
  amountInr,
  orderId,
  keyId,
  username,
  onSuccess,
  onCancel,
  onFailure,
}: RazorpayModalProps) {
  const C = useThemeC();
  const styles = makeStyles(C);

  if (!visible) return null;

  const html = getRazorpayCheckoutHtml({
    keyId: keyId || RAZORPAY_KEY_ID,
    amountInr,
    packName,
    orderId,
    username,
  });

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.event === "success") {
        onSuccess({
          paymentId: data.payment_id,
          orderId: data.order_id,
          signature: data.signature,
        });
      } else if (data.event === "dismissed") {
        onCancel();
      } else if (data.event === "failed" || data.event === "error") {
        onFailure(data.reason || data.message || "Payment was not completed.");
      }
    } catch (e) {
      onFailure("Unexpected response from checkout.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Secure Checkout</Text>
            <Text style={styles.subtitle}>
              {packName} · ₹{amountInr}
            </Text>
          </View>
          <Pressable onPress={onCancel} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.webContainer}>
          <WebView
            originWhitelist={["*"]}
            source={{ html, baseUrl: "https://checkout.razorpay.com" }}
            onMessage={handleMessage}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={C.accent} size="large" />
                <Text style={styles.loadingText}>Connecting to Razorpay...</Text>
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url;
              if (
                url.startsWith("upi://") ||
                url.startsWith("intent://") ||
                url.startsWith("phonepe://") ||
                url.startsWith("gpay://") ||
                url.startsWith("paytmmp://")
              ) {
                Linking.openURL(url).catch((err) => {
                  console.warn("Could not launch payment app:", err);
                });
                return false;
              }
              return true;
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.ground,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.line,
      backgroundColor: C.surface,
    },
    title: {
      color: C.text,
      fontWeight: "900",
      fontSize: 18,
    },
    subtitle: {
      color: C.accent,
      fontWeight: "700",
      fontSize: 14,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    closeText: {
      color: C.muted,
      fontWeight: "800",
      fontSize: 14,
    },
    webContainer: {
      flex: 1,
      backgroundColor: C.ground,
    },
    webview: {
      flex: 1,
      backgroundColor: "transparent",
    },
    loading: {
      ...StyleSheet.absoluteFill,
      backgroundColor: C.ground,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingText: {
      color: C.muted,
      fontWeight: "600",
      fontSize: 14,
    },
  });
