import React, { useState, useEffect } from "react";
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
  Linking,
} from "react-native";
import { useGame } from "../state/store";
import { useThemeC, type Palette } from "../theme";
import * as SFX from "../lib/sfx";
import * as Haptics from "expo-haptics";
import * as api from "../lib/api";
import type { PurchaseRecord } from "../lib/api";
import { LEGAL_URLS } from "../lib/legal";
import { signInWithGoogle, signInWithApple, isAppleSignInSupported } from "../lib/socialAuth";
import { accountLevel } from "../lib/level";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AccountModal({ visible, onClose }: AccountModalProps) {
  const C = useThemeC();
  const styles = makeStyles(C);
  const {
    authUser,
    username,
    coins,
    xp,
    linkAccount,
    signInAccount,
    signOutAccount,
    deleteAccount,
    openLocker,
  } = useGame();

  const acct = accountLevel(xp);
  const isAnonymous = authUser?.isAnonymous ?? true;
  const userEmail = authUser?.email;

  const [activeTab, setActiveTab] = useState<"account" | "orders">("account");
  const [authMode, setAuthMode] = useState<"link" | "login">("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Orders / Invoices state
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    isAppleSignInSupported().then(setAppleAvailable).catch(() => {});
  }, []);

  useEffect(() => {
    if (visible && activeTab === "orders") {
      loadPurchases();
    }
  }, [visible, activeTab]);

  const loadPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const list = await api.fetchUserPurchases();
      setPurchases(list);
    } catch {
      setPurchases([]);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    SFX.play("tap");
    try {
      const res = await signInWithGoogle();
      if (res.ok) {
        SFX.play("correct");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSuccessMsg("Signed in with Google! Restoring profile...");
        setTimeout(() => onClose(), 1200);
      } else if (res.message) {
        setErrorMsg(res.message);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleAppleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    SFX.play("tap");
    try {
      const res = await signInWithApple();
      if (res.ok) {
        SFX.play("correct");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSuccessMsg("Signed in with Apple! Restoring profile...");
        setTimeout(() => onClose(), 1200);
      } else if (res.message) {
        setErrorMsg(res.message);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Apple sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async () => {
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
      if (authMode === "link") {
        const res = await linkAccount(cleanEmail, password);
        if (res.ok) {
          SFX.play("correct");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSuccessMsg("Account saved! Your progress is now backed up.");
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
          setSuccessMsg("Signed in successfully! Restoring profile...");
          setTimeout(() => onClose(), 1200);
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

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.modalCard}>
            {/* Top Bar with Close */}
            <View style={styles.topHeader}>
              <View style={styles.profileBadgeRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(username || "P").charAt(0).toUpperCase()}
                  </Text>
                  <View style={styles.lvBadge}>
                    <Text style={styles.lvBadgeText}>{acct.level}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.username} numberOfLines={1}>
                    {username || "Player"}
                  </Text>
                  <View style={styles.statusPillRow}>
                    <View
                      style={[
                        styles.statusPill,
                        isAnonymous ? styles.statusPillGuest : styles.statusPillSaved,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isAnonymous ? styles.statusPillGuestText : styles.statusPillSavedText,
                        ]}
                      >
                        {isAnonymous ? "Guest Profile" : "Saved & Protected"}
                      </Text>
                    </View>
                    <View style={styles.coinBadge}>
                      <Text style={styles.coinBadgeSymbol}>₵</Text>
                      <Text style={styles.coinBadgeText}>{fmt(coins)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            {/* Navigation Tabs: Account vs Invoices */}
            <View style={styles.mainTabBar}>
              <Pressable
                onPress={() => {
                  SFX.play("tap");
                  setActiveTab("account");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={[styles.mainTab, activeTab === "account" && styles.mainTabActive]}
              >
                <Text
                  style={[styles.mainTabText, activeTab === "account" && styles.mainTabTextActive]}
                >
                  👤 Account & Login
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  SFX.play("tap");
                  setActiveTab("orders");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={[styles.mainTab, activeTab === "orders" && styles.mainTabActive]}
              >
                <Text
                  style={[styles.mainTabText, activeTab === "orders" && styles.mainTabTextActive]}
                >
                  🧾 Orders & Invoices
                </Text>
              </Pressable>
            </View>

            {/* Content ScrollView */}
            <ScrollView
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
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

              {activeTab === "account" ? (
                /* ================= TAB 1: ACCOUNT & AUTH ================= */
                <View>
                  {!isAnonymous ? (
                    // Connected Permanent Account View
                    <View style={styles.connectedBox}>
                      <View style={styles.shieldIconWrap}>
                        <Text style={{ fontSize: 28 }}>🛡️</Text>
                      </View>
                      <Text style={styles.connectedTitle}>Account Protected</Text>
                      <Text style={styles.connectedEmail}>{userEmail}</Text>
                      <Text style={styles.connectedDesc}>
                        Your coins, level progress, purchases, and league standings are linked to
                        this account.
                      </Text>

                      {/* Theme locker shortcut */}
                      <Pressable
                        onPress={() => {
                          SFX.play("tap");
                          onClose();
                          openLocker();
                        }}
                        style={styles.lockerShortcutBtn}
                      >
                        <Text style={styles.lockerShortcutText}>🎨 Theme & Skin Locker ›</Text>
                      </Pressable>

                      {/* Log Out Button */}
                      <Pressable
                        onPress={handleSignOut}
                        disabled={busy}
                        style={styles.signOutBtn}
                      >
                        {busy ? (
                          <ActivityIndicator color={C.text} />
                        ) : (
                          <Text style={styles.signOutText}>Log Out (Switch Account)</Text>
                        )}
                      </Pressable>

                      {/* Mandatory Account Deletion */}
                      {!confirmDelete ? (
                        <Pressable
                          onPress={() => setConfirmDelete(true)}
                          style={styles.deletePromptBtn}
                        >
                          <Text style={styles.deletePromptText}>Delete Account & Data</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.deleteConfirmBox}>
                          <Text style={styles.deleteConfirmTitle}>⚠️ Permanently Delete?</Text>
                          <Text style={styles.deleteConfirmDesc}>
                            This permanently wipes your profile, email, authentication, and stats.
                            (Statutory financial purchase receipts are anonymized for tax
                            compliance).
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
                    // Guest Account: Save or Sign In
                    <View>
                      <Text style={styles.guestNotice}>
                        ⚠️ You are currently playing on a temporary Guest profile. Link your Google,
                        Apple, or email account to protect your coins and progress across devices.
                      </Text>

                      {/* 1-Tap Google Sign-In */}
                      <Pressable
                        onPress={handleGoogleSignIn}
                        disabled={busy}
                        style={styles.googleSocialBtn}
                      >
                        <Text style={styles.googleG}>G</Text>
                        <Text style={styles.googleSocialText}>Continue with Google</Text>
                      </Pressable>

                      {/* 1-Tap Apple Sign-In (iOS) */}
                      {appleAvailable && (
                        <Pressable
                          onPress={handleAppleSignIn}
                          disabled={busy}
                          style={styles.appleSocialBtn}
                        >
                          <Text style={styles.appleIcon}></Text>
                          <Text style={styles.appleSocialText}>Continue with Apple</Text>
                        </Pressable>
                      )}

                      <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or with email</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      {/* Mode Tabs: Link vs Login */}
                      <View style={styles.authModeTabBar}>
                        <Pressable
                          onPress={() => {
                            SFX.play("tap");
                            setAuthMode("link");
                            setErrorMsg(null);
                          }}
                          style={[styles.authTab, authMode === "link" && styles.authTabActive]}
                        >
                          <Text
                            style={[
                              styles.authTabText,
                              authMode === "link" && styles.authTabTextActive,
                            ]}
                          >
                            Save Guest Progress
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            SFX.play("tap");
                            setAuthMode("login");
                            setErrorMsg(null);
                          }}
                          style={[styles.authTab, authMode === "login" && styles.authTabActive]}
                        >
                          <Text
                            style={[
                              styles.authTabText,
                              authMode === "login" && styles.authTabTextActive,
                            ]}
                          >
                            Log In
                          </Text>
                        </Pressable>
                      </View>

                      <Text style={styles.inputLabel}>Email Address</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="yourname@example.com"
                        placeholderTextColor={C.muted}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoCorrect={false}
                        style={styles.input}
                      />

                      <Text style={styles.inputLabel}>Password</Text>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="At least 6 characters"
                        placeholderTextColor={C.muted}
                        secureTextEntry
                        style={styles.input}
                      />

                      <Pressable
                        onPress={handleEmailSubmit}
                        disabled={busy}
                        style={[styles.submitBtn, busy && { opacity: 0.6 }]}
                      >
                        {busy ? (
                          <ActivityIndicator color={C.goldText} />
                        ) : (
                          <Text style={styles.submitText}>
                            {authMode === "link" ? "Save My Progress" : "Log In & Restore"}
                          </Text>
                        )}
                      </Pressable>

                      {/* Reset Guest Profile */}
                      {!confirmDelete ? (
                        <Pressable
                          onPress={() => setConfirmDelete(true)}
                          style={[styles.deletePromptBtn, { marginTop: 20 }]}
                        >
                          <Text style={styles.deletePromptText}>Reset Guest Profile & Data</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.deleteConfirmBox}>
                          <Text style={styles.deleteConfirmTitle}>⚠️ Reset Guest Profile?</Text>
                          <Text style={styles.deleteConfirmDesc}>
                            This wipes your current guest coins and match records from the device.
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
                                <Text style={styles.deleteConfirmBtnText}>Permanently Reset</Text>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                /* ================= TAB 2: ORDERS & INVOICES ================= */
                <View>
                  <View style={styles.ordersHeaderRow}>
                    <Text style={styles.ordersTitle}>Your Purchase History</Text>
                    <Pressable onPress={loadPurchases} hitSlop={8}>
                      <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
                    </Pressable>
                  </View>

                  {loadingPurchases ? (
                    <View style={styles.centerLoading}>
                      <ActivityIndicator color={C.accent} size="large" />
                      <Text style={styles.loadingText}>Fetching order invoices...</Text>
                    </View>
                  ) : purchases.length === 0 ? (
                    <View style={styles.emptyOrdersBox}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>🧾</Text>
                      <Text style={styles.emptyOrdersTitle}>No Orders Yet</Text>
                      <Text style={styles.emptyOrdersDesc}>
                        When you purchase virtual coin packs in the Store, your official receipts,
                        Razorpay order IDs, and tax invoices will appear here.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {purchases.map((p) => {
                        const isExpanded = expandedInvoiceId === p.id;
                        const dateStr = new Date(p.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        });
                        const baseAmt = (p.amount_inr / 1.18).toFixed(2);
                        const gstAmt = (p.amount_inr - p.amount_inr / 1.18).toFixed(2);

                        return (
                          <View key={p.id} style={styles.orderCard}>
                            <View style={styles.orderCardTop}>
                              <View>
                                <Text style={styles.orderPackName}>
                                  🪙 {fmt(p.coins)} Coins Pack
                                </Text>
                                <Text style={styles.orderDate}>{dateStr}</Text>
                              </View>
                              <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.orderPrice}>₹{p.amount_inr}</Text>
                                <View
                                  style={[
                                    styles.orderStatusBadge,
                                    p.status === "completed"
                                      ? styles.orderStatusCompleted
                                      : styles.orderStatusPending,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.orderStatusText,
                                      p.status === "completed"
                                        ? styles.orderStatusCompletedText
                                        : styles.orderStatusPendingText,
                                    ]}
                                  >
                                    {p.status === "completed" ? "PAID ✓" : p.status.toUpperCase()}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <Pressable
                              onPress={() => {
                                SFX.play("tap");
                                setExpandedInvoiceId(isExpanded ? null : p.id);
                              }}
                              style={styles.invoiceToggleBtn}
                            >
                              <Text style={styles.invoiceToggleText}>
                                {isExpanded ? "Hide Tax Invoice ▲" : "View Tax Invoice ▼"}
                              </Text>
                            </Pressable>

                            {isExpanded && (
                              <View style={styles.invoiceBreakdownBox}>
                                <Text style={styles.invoiceHead}>TAX INVOICE / RECEIPT</Text>
                                <View style={styles.invoiceRow}>
                                  <Text style={styles.invLabel}>Merchant:</Text>
                                  <Text style={styles.invVal}>GyanBlitz EdTech</Text>
                                </View>
                                <View style={styles.invoiceRow}>
                                  <Text style={styles.invLabel}>Order ID:</Text>
                                  <Text style={styles.invVal} numberOfLines={1}>
                                    {p.order_id || "N/A"}
                                  </Text>
                                </View>
                                <View style={styles.invoiceRow}>
                                  <Text style={styles.invLabel}>Payment ID:</Text>
                                  <Text style={styles.invVal} numberOfLines={1}>
                                    {p.payment_id || "N/A"}
                                  </Text>
                                </View>
                                <View style={styles.invDivider} />
                                <View style={styles.invoiceRow}>
                                  <Text style={styles.invLabel}>Taxable Value:</Text>
                                  <Text style={styles.invVal}>₹{baseAmt}</Text>
                                </View>
                                <View style={styles.invoiceRow}>
                                  <Text style={styles.invLabel}>GST (18% inclusive):</Text>
                                  <Text style={styles.invVal}>₹{gstAmt}</Text>
                                </View>
                                <View style={[styles.invoiceRow, { marginTop: 4 }]}>
                                  <Text style={[styles.invLabel, { fontWeight: "900", color: C.text }]}>
                                    Total Paid:
                                  </Text>
                                  <Text style={[styles.invVal, { fontWeight: "900", color: C.accent }]}>
                                    ₹{p.amount_inr}.00
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Legal & Policy Links */}
              <View style={styles.legalFooter}>
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
                >
                  Privacy Policy
                </Text>
                <Text style={styles.legalDot}>•</Text>
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(LEGAL_URLS.terms)}
                >
                  Terms of Service
                </Text>
                <Text style={styles.legalDot}>•</Text>
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(`mailto:${LEGAL_URLS.supportEmail}`)}
                >
                  Support
                </Text>
              </View>
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
      backgroundColor: "rgba(0,0,0,0.72)",
      justifyContent: "flex-end",
    },
    keyboardWrap: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 24,
      maxHeight: "90%",
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    topHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.line,
      marginBottom: 12,
    },
    profileBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
      marginRight: 10,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    avatarText: {
      color: C.goldText,
      fontWeight: "900",
      fontSize: 22,
    },
    lvBadge: {
      position: "absolute",
      bottom: -4,
      right: -4,
      backgroundColor: C.ground,
      borderColor: C.line,
      borderWidth: 1.5,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    lvBadgeText: {
      color: C.accent,
      fontSize: 10,
      fontWeight: "900",
    },
    username: {
      color: C.text,
      fontWeight: "900",
      fontSize: 18,
    },
    statusPillRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 3,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: "800",
    },
    statusPillGuest: {
      backgroundColor: "rgba(255,197,61,0.12)",
      borderColor: C.accent,
      borderWidth: 1,
    },
    statusPillSaved: {
      backgroundColor: "rgba(52,211,153,0.12)",
      borderColor: C.correct,
      borderWidth: 1,
    },
    statusPillGuestText: {
      color: C.accent,
      fontSize: 11,
      fontWeight: "800",
    },
    statusPillSavedText: {
      color: C.correct,
      fontSize: 11,
      fontWeight: "800",
    },
    coinBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: C.coinPill,
      borderColor: C.coinBorder,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    coinBadgeSymbol: {
      color: C.accent,
      fontWeight: "900",
      fontSize: 11,
    },
    coinBadgeText: {
      color: C.text,
      fontWeight: "800",
      fontSize: 12,
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
      fontSize: 16,
      fontWeight: "700",
    },
    mainTabBar: {
      flexDirection: "row",
      backgroundColor: C.ground,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    mainTab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 9,
    },
    mainTabActive: {
      backgroundColor: C.surface,
    },
    mainTabText: {
      color: C.muted,
      fontWeight: "800",
      fontSize: 13,
    },
    mainTabTextActive: {
      color: C.accent,
    },
    connectedBox: {
      alignItems: "center",
      paddingVertical: 12,
    },
    shieldIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(52,211,153,0.12)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    connectedTitle: {
      color: C.text,
      fontWeight: "900",
      fontSize: 19,
    },
    connectedEmail: {
      color: C.accent,
      fontWeight: "800",
      fontSize: 15,
      marginTop: 4,
    },
    connectedDesc: {
      color: C.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 18,
      marginTop: 8,
      paddingHorizontal: 12,
    },
    lockerShortcutBtn: {
      width: "100%",
      backgroundColor: C.surface2,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 18,
      marginBottom: 10,
    },
    lockerShortcutText: {
      color: C.text,
      fontWeight: "800",
      fontSize: 14,
    },
    signOutBtn: {
      width: "100%",
      backgroundColor: "transparent",
      borderColor: C.line,
      borderWidth: 1.5,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 10,
    },
    signOutText: {
      color: C.text,
      fontWeight: "800",
      fontSize: 14,
    },
    guestNotice: {
      color: C.accent,
      backgroundColor: "rgba(255,197,61,0.08)",
      borderColor: "rgba(255,197,61,0.25)",
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 16,
      fontWeight: "600",
    },
    googleSocialBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
      borderRadius: 14,
      paddingVertical: 14,
      gap: 10,
      marginBottom: 10,
    },
    googleG: {
      fontSize: 18,
      fontWeight: "900",
      color: "#4285F4",
    },
    googleSocialText: {
      color: "#1f1f1f",
      fontWeight: "800",
      fontSize: 15,
    },
    appleSocialBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000000",
      borderColor: "#333333",
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      gap: 10,
      marginBottom: 10,
    },
    appleIcon: {
      fontSize: 18,
      color: "#ffffff",
    },
    appleSocialText: {
      color: "#ffffff",
      fontWeight: "800",
      fontSize: 15,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 10,
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: C.line,
    },
    dividerText: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    authModeTabBar: {
      flexDirection: "row",
      backgroundColor: C.ground,
      borderRadius: 12,
      padding: 4,
      marginBottom: 14,
    },
    authTab: {
      flex: 1,
      paddingVertical: 9,
      alignItems: "center",
      borderRadius: 8,
    },
    authTabActive: {
      backgroundColor: C.surface,
    },
    authTabText: {
      color: C.muted,
      fontWeight: "700",
      fontSize: 13,
    },
    authTabTextActive: {
      color: C.text,
      fontWeight: "900",
    },
    inputLabel: {
      color: C.text,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      backgroundColor: C.ground,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: C.text,
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 12,
    },
    submitBtn: {
      backgroundColor: C.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 6,
    },
    submitText: {
      color: C.goldText,
      fontWeight: "900",
      fontSize: 16,
    },
    deletePromptBtn: {
      paddingVertical: 12,
      alignItems: "center",
    },
    deletePromptText: {
      color: C.wrong,
      fontWeight: "800",
      fontSize: 13,
      textDecorationLine: "underline",
    },
    deleteConfirmBox: {
      backgroundColor: "rgba(255,92,92,0.12)",
      borderColor: C.wrong,
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginTop: 12,
      width: "100%",
    },
    deleteConfirmTitle: {
      color: C.wrong,
      fontWeight: "900",
      fontSize: 15,
      marginBottom: 6,
    },
    deleteConfirmDesc: {
      color: C.muted,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 12,
    },
    deleteActions: {
      flexDirection: "row",
      gap: 10,
    },
    deleteCancelBtn: {
      flex: 1,
      backgroundColor: C.surface,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    deleteCancelText: {
      color: C.text,
      fontWeight: "800",
      fontSize: 13,
    },
    deleteConfirmBtn: {
      flex: 1,
      backgroundColor: C.wrong,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    deleteConfirmBtnText: {
      color: "#ffffff",
      fontWeight: "900",
      fontSize: 13,
    },
    ordersHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    ordersTitle: {
      color: C.text,
      fontWeight: "900",
      fontSize: 16,
    },
    refreshBtnText: {
      color: C.accent,
      fontWeight: "800",
      fontSize: 13,
    },
    centerLoading: {
      paddingVertical: 36,
      alignItems: "center",
      gap: 10,
    },
    loadingText: {
      color: C.muted,
      fontSize: 13,
      fontWeight: "600",
    },
    emptyOrdersBox: {
      backgroundColor: C.ground,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      marginVertical: 12,
    },
    emptyOrdersTitle: {
      color: C.text,
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 4,
    },
    emptyOrdersDesc: {
      color: C.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 18,
    },
    orderCard: {
      backgroundColor: C.ground,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    orderCardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    orderPackName: {
      color: C.text,
      fontWeight: "900",
      fontSize: 15,
    },
    orderDate: {
      color: C.muted,
      fontSize: 12,
      marginTop: 2,
    },
    orderPrice: {
      color: C.accent,
      fontWeight: "900",
      fontSize: 16,
    },
    orderStatusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginTop: 3,
    },
    orderStatusCompleted: {
      backgroundColor: "rgba(52,211,153,0.15)",
    },
    orderStatusPending: {
      backgroundColor: "rgba(255,197,61,0.15)",
    },
    orderStatusText: {
      fontSize: 10,
      fontWeight: "900",
    },
    orderStatusCompletedText: {
      color: C.correct,
    },
    orderStatusPendingText: {
      color: C.accent,
    },
    invoiceToggleBtn: {
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: C.line,
      alignItems: "center",
    },
    invoiceToggleText: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "800",
    },
    invoiceBreakdownBox: {
      backgroundColor: C.surface,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
    },
    invoiceHead: {
      color: C.accent,
      fontWeight: "900",
      fontSize: 11,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    invoiceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    invLabel: {
      color: C.muted,
      fontSize: 12,
    },
    invVal: {
      color: C.text,
      fontSize: 12,
      fontWeight: "700",
      maxWidth: "60%",
    },
    invDivider: {
      height: 1,
      backgroundColor: C.line,
      marginVertical: 6,
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
      backgroundColor: "rgba(52,211,153,0.1)",
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
    legalFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    legalLink: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "700",
      textDecorationLine: "underline",
    },
    legalDot: {
      color: C.line,
      fontSize: 12,
    },
  });
