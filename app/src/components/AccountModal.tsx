import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useGame } from "../state/store";
import { useThemeC, type Palette } from "../theme";
import * as SFX from "../lib/sfx";
import * as Haptics from "expo-haptics";

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AccountModal({ visible, onClose }: AccountModalProps) {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { authUser, linkAccount, signInAccount, signOutAccount, deleteAccount } = useGame();

  const [mode, setMode] = useState<"link" | "login">("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!visible) return null;

  const isAnonymous = authUser?.isAnonymous ?? true;
  const userEmail = authUser?.email;

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    SFX.play("tap");

    try {
      if (mode === "link") {
        const res = await linkAccount(cleanEmail, password);
        if (res.ok) {
          SFX.play("correct");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSuccessMsg("Account linked successfully! Your progress is now backed up.");
          setEmail("");
          setPassword("");
        } else {
          setErrorMsg(res.message || "Failed to link account.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
      } else {
        const res = await signInAccount(cleanEmail, password);
        if (res.ok) {
          SFX.play("correct");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSuccessMsg("Signed in successfully! Restoring your profile...");
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setErrorMsg(res.message || "Invalid email or password.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "An unexpected error occurred.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    SFX.play("tap");
    setBusy(true);
    try {
      await signOutAccount();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    SFX.play("wrong");
    setBusy(true);
    try {
      await deleteAccount();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setConfirmDelete(false);
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to delete account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {isAnonymous ? "Save Your Progress" : "Account Settings"}
                </Text>
                <Text style={styles.subtitle}>
                  {isAnonymous ? "Guest Profile" : "Connected Account"}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {!isAnonymous ? (
                // Already Linked Account View
                <View style={styles.linkedBox}>
                  <View style={styles.verifiedIcon}>
                    <Text style={{ fontSize: 24 }}>🛡️</Text>
                  </View>
                  <Text style={styles.linkedTitle}>Account Protected</Text>
                  <Text style={styles.linkedEmail}>{userEmail}</Text>
                  <Text style={styles.linkedDesc}>
                    Your coins, purchases, skins, and league trophies are securely linked to this account.
                  </Text>

                  <Pressable
                    onPress={handleSignOut}
                    disabled={busy}
                    style={styles.signOutBtn}
                  >
                    {busy ? (
                      <ActivityIndicator color={C.muted} />
                    ) : (
                      <Text style={styles.signOutText}>Sign Out</Text>
                    )}
                  </Pressable>

                  {/* Mandatory Account Deletion (Apple Guideline 5.1.1(v) & Google Play) */}
                  {!confirmDelete ? (
                    <Pressable
                      onPress={() => setConfirmDelete(true)}
                      style={styles.deletePromptBtn}
                    >
                      <Text style={styles.deletePromptText}>Delete Account & Data</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.deleteConfirmBox}>
                      <Text style={styles.deleteConfirmTitle}>⚠️ Delete Account Permanently?</Text>
                      <Text style={styles.deleteConfirmDesc}>
                        This will permanently delete your profile, email, all coin balances, purchased cosmetics, and league rankings from our servers. This action cannot be undone.
                      </Text>
                      <View style={styles.deleteActions}>
                        <Pressable
                          onPress={() => setConfirmDelete(false)}
                          style={styles.deleteCancelBtn}
                          disabled={busy}
                        >
                          <Text style={styles.deleteCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleDeleteAccount}
                          style={styles.deleteConfirmBtn}
                          disabled={busy}
                        >
                          {busy ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.deleteConfirmBtnText}>Permanently Delete</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                // Guest Account: Link or Sign In
                <View>
                  <Text style={styles.guestNotice}>
                    ⚠️ You are playing as a Guest. If you reinstall GyanBlitz or switch devices, your coins and progress will be lost.
                  </Text>

                  <View style={styles.tabBar}>
                    <Pressable
                      onPress={() => {
                        SFX.play("tap");
                        setMode("link");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      style={[styles.tab, mode === "link" && styles.tabActive]}
                    >
                      <Text style={[styles.tabText, mode === "link" && styles.tabTextActive]}>
                        Save Current Account
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        SFX.play("tap");
                        setMode("login");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      style={[styles.tab, mode === "login" && styles.tabActive]}
                    >
                      <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>
                        Log In
                      </Text>
                    </Pressable>
                  </View>

                  {errorMsg && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                    </View>
                  )}

                  {successMsg && (
                    <View style={styles.successBox}>
                      <Text style={styles.successText}>✓ {successMsg}</Text>
                    </View>
                  )}

                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="student@example.com"
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    style={styles.input}
                  />

                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={C.muted}
                    secureTextEntry
                    style={styles.input}
                  />

                  <Pressable
                    onPress={handleSubmit}
                    disabled={busy}
                    style={[styles.submitBtn, busy && { opacity: 0.6 }]}
                  >
                    {busy ? (
                      <ActivityIndicator color={C.goldText} />
                    ) : (
                      <Text style={styles.submitText}>
                        {mode === "link" ? "Save My Progress" : "Log In & Restore"}
                      </Text>
                    )}
                  </Pressable>

                  {/* Guest Deletion / Reset Option */}
                  {!confirmDelete ? (
                    <Pressable
                      onPress={() => setConfirmDelete(true)}
                      style={[styles.deletePromptBtn, { marginTop: 24 }]}
                    >
                      <Text style={styles.deletePromptText}>Reset Guest Profile & Data</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.deleteConfirmBox}>
                      <Text style={styles.deleteConfirmTitle}>⚠️ Reset Guest Profile?</Text>
                      <Text style={styles.deleteConfirmDesc}>
                        This will permanently delete this guest profile, coins, and records from our servers.
                      </Text>
                      <View style={styles.deleteActions}>
                        <Pressable
                          onPress={() => setConfirmDelete(false)}
                          style={styles.deleteCancelBtn}
                          disabled={busy}
                        >
                          <Text style={styles.deleteCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleDeleteAccount}
                          style={styles.deleteConfirmBtn}
                          disabled={busy}
                        >
                          {busy ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.deleteConfirmBtnText}>Reset & Delete</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "flex-end",
    },
    keyboardWrap: {
      width: "100%",
    },
    modalCard: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 22,
      maxHeight: "90%",
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    title: {
      color: C.accent,
      fontWeight: "900",
      fontSize: 22,
    },
    subtitle: {
      color: C.muted,
      fontSize: 13,
      fontWeight: "700",
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
    guestNotice: {
      color: C.accent2,
      backgroundColor: "rgba(255,77,141,0.08)",
      borderColor: "rgba(255,77,141,0.25)",
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 16,
      fontWeight: "600",
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: C.surface2,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 8,
    },
    tabActive: {
      backgroundColor: C.surface,
    },
    tabText: {
      color: C.muted,
      fontWeight: "700",
      fontSize: 13,
    },
    tabTextActive: {
      color: C.text,
      fontWeight: "900",
    },
    label: {
      color: C.text,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      backgroundColor: C.surface2,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: C.text,
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 14,
    },
    submitBtn: {
      backgroundColor: C.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    submitText: {
      color: C.goldText,
      fontWeight: "900",
      fontSize: 16,
    },
    errorBox: {
      backgroundColor: "rgba(255,92,92,0.1)",
      borderColor: C.wrong,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },
    errorText: {
      color: C.wrong,
      fontWeight: "700",
      fontSize: 13,
    },
    successBox: {
      backgroundColor: "rgba(61,220,151,0.1)",
      borderColor: C.correct,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },
    successText: {
      color: C.correct,
      fontWeight: "700",
      fontSize: 13,
    },
    linkedBox: {
      alignItems: "center",
      paddingVertical: 16,
    },
    verifiedIcon: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: "rgba(61,220,151,0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    linkedTitle: {
      color: C.text,
      fontWeight: "900",
      fontSize: 20,
    },
    linkedEmail: {
      color: C.accent,
      fontWeight: "800",
      fontSize: 15,
      marginTop: 4,
    },
    linkedDesc: {
      color: C.muted,
      fontSize: 13,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 18,
      paddingHorizontal: 16,
    },
    signOutBtn: {
      marginTop: 20,
      backgroundColor: C.surface2,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    signOutText: {
      color: C.muted,
      fontWeight: "800",
      fontSize: 14,
    },
    deletePromptBtn: {
      marginTop: 18,
      padding: 8,
    },
    deletePromptText: {
      color: C.wrong,
      fontSize: 12,
      fontWeight: "700",
      textDecorationLine: "underline",
    },
    deleteConfirmBox: {
      marginTop: 18,
      width: "100%",
      backgroundColor: "rgba(255,92,92,0.08)",
      borderColor: "rgba(255,92,92,0.3)",
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    deleteConfirmTitle: {
      color: C.wrong,
      fontWeight: "900",
      fontSize: 15,
      marginBottom: 6,
    },
    deleteConfirmDesc: {
      color: C.text,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 12,
      opacity: 0.9,
    },
    deleteActions: {
      flexDirection: "row",
      gap: 10,
    },
    deleteCancelBtn: {
      flex: 1,
      backgroundColor: C.surface2,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    deleteCancelText: {
      color: C.text,
      fontWeight: "700",
      fontSize: 13,
    },
    deleteConfirmBtn: {
      flex: 1.5,
      backgroundColor: C.wrong,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    deleteConfirmBtnText: {
      color: "#fff",
      fontWeight: "900",
      fontSize: 13,
    },
  });
