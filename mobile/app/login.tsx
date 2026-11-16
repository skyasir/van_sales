/**
 * Sign-in against an ERPNext site.
 *
 * The site address is a field rather than a build constant so the same APK
 * serves production and UAT, which is how these get rolled out in practice.
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { colors, mono, radius, shadow, space } from '../src/ui/theme';

export default function Login() {
  const router = useRouter();
  const { signIn, lastSite, lastUser, staleSession, ready, credentials } = useAuth();
  const insets = useSafeAreaInsets();

  const [site, setSite] = useState('');
  const [usr, setUsr] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lastSite) setSite(lastSite);
    if (lastUser) setUsr(lastUser);
  }, [lastSite, lastUser]);

  useEffect(() => {
    if (ready && credentials) {
      router.replace('/(app)/van_home');
    }
  }, [ready, credentials, router]);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      // await signIn(site, usr, pwd);
      // router.replace('/(app)/home');
      await signIn(site, usr, pwd);
      router.replace('/(app)/van_home');
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : 'Could not sign in. Check the site address.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = site.trim() && usr.trim() && pwd && !busy;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>Sign in</Text>
        <Text style={s.subtitle}>Field Operations</Text>

        {staleSession && (
          <View style={s.notice}>
            <Text style={s.noticeText}>
              You have been offline past the allowed window. Sign in again to keep working.
            </Text>
          </View>
        )}

        <View style={s.form}>
          <Field label="Site address">
            <TextInput
              value={site}
              onChangeText={setSite}
              placeholder="192.168.1.10:8000 or erp.example.com"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[s.input, { fontFamily: mono, fontSize: 14.5 }]}
            />
          </Field>

          <Field label="User ID">
            <TextInput
              value={usr}
              onChangeText={setUsr}
              placeholder="name@example.ae"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              style={s.input}
            />
          </Field>

          <Field label="Password">
            <View style={s.pwRow}>
              <TextInput
                value={pwd}
                onChangeText={setPwd}
                secureTextEntry={!showPwd}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                textContentType="password"
                onSubmitEditing={canSubmit ? submit : undefined}
                returnKeyType="go"
                style={[s.input, { flex: 1 }]}
              />
              <Pressable onPress={() => setShowPwd((v) => !v)} hitSlop={12} style={s.pwToggle}>
                <Text style={s.pwToggleText}>{showPwd ? 'HIDE' : 'SHOW'}</Text>
              </Pressable>
            </View>
          </Field>

          {!!error && (
            <View style={s.error}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={canSubmit ? submit : undefined}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy }}
            style={({ pressed }) => [
              s.submit,
              { opacity: !canSubmit ? 0.45 : pressed ? 0.85 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.submitText}>Sign in</Text>
            )}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>
            Your roles in ERPNext decide what this app shows you.{'\n'}Nothing is configured on the
            phone.
          </Text>
          <View style={s.by}>
            <Text style={s.byText}>by Yasir Shaikh</Text>
            <Text
              style={s.byLink}
              onPress={() => Linking.openURL('mailto:erp.yasirshaikh@gmail.com')}
            >
              erp.yasirshaikh@gmail.com
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101828' },
  scroll: { paddingHorizontal: 22, gap: space.md, flexGrow: 1 },
  logo: { width: 96, height: 96, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '600', color: '#fff', letterSpacing: -0.5, marginTop: space.md },
  subtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.55)', marginTop: -space.sm },
  form: { gap: space.md, marginTop: space.sm },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '700',
  },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.md + 1,
    paddingHorizontal: 13,
    height: 54,
    justifyContent: 'center',
  },
  input: { color: '#fff', fontSize: 15.5, height: 54 },
  pwRow: { flexDirection: 'row', alignItems: 'center' },
  pwToggle: { paddingHorizontal: 6, paddingVertical: 8 },
  pwToggleText: { color: '#8FB0FF', fontSize: 12, fontWeight: '700' },
  submit: {
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
    ...shadow.button,
  },
  submitText: { color: '#fff', fontSize: 16.5, fontWeight: '700' },
  notice: {
    backgroundColor: 'rgba(220,104,3,0.16)',
    borderColor: 'rgba(240,213,172,0.4)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  noticeText: { color: '#F5C88B', fontSize: 12.5, lineHeight: 18 },
  error: {
    backgroundColor: 'rgba(217,45,32,0.16)',
    borderColor: 'rgba(242,199,199,0.35)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  errorText: { color: '#FDA29B', fontSize: 13, lineHeight: 19 },
  footer: { marginTop: 'auto', paddingTop: space.xl, gap: space.md },
  footerText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
  },
  by: {
    alignItems: 'center',
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: space.md,
  },
  byText: { color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: '600' },
  byLink: { color: '#8FB0FF', fontSize: 12 },
});
