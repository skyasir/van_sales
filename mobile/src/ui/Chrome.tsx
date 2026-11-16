/**
 * The frame every signed-in screen sits in: a header carrying the sync
 * state, and a bottom bar whose tabs come from the server.
 *
 * The tab set is never hardcoded per build. `bootstrap.tabs[persona]` is
 * what renders, so adding a role on the desk changes the app.
 */

import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { colors, radius, space } from './theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Server icon names -> the set actually bundled with the app. */
const ICONS: Record<string, IoniconName> = {
  route: 'map-outline',
  scan: 'scan-outline',
  customers: 'people-outline',
  stock: 'cube-outline',
  plus: 'add-circle-outline',
  orders: 'document-text-outline',
  approvals: 'checkmark-circle-outline',
  team: 'people-circle-outline',
  cash: 'cash-outline',
  alert: 'warning-outline',
  dashboard: 'grid-outline',
  chart: 'bar-chart-outline',
  person: 'person-circle-outline',
};

export function SyncPill({ pending = 0 }: { pending?: number }) {
  const online = pending === 0;

  return (
    <View
      style={[
        s.pill,
        {
          backgroundColor: online ? colors.successWash : colors.warningWash,
          borderColor: online ? colors.successBorder : colors.warningBorder,
        },
      ]}
    >
      <View
        style={[s.dot, { backgroundColor: online ? '#17B26A' : '#F79009' }]}
      />
      <Text style={[s.pillText, { color: online ? '#067647' : '#B54708' }]}>
        {online ? 'Synced' : `${pending} queued`}
      </Text>
    </View>
  );
}

export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  const goToDesk = () => {
    if (Platform.OS === 'web') {
      window.location.href = '/app';
    }
  };

  return (
    <View style={[s.header, { paddingTop: insets.top + space.md }]}>
      {!!onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={s.back}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>

        {!!subtitle && (
          <Text style={s.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {Platform.OS === 'web' && (
        <Pressable
          onPress={goToDesk}
          style={s.deskButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Desk"
        >
          <Ionicons
            name="arrow-back-outline"
            size={16}
            color={colors.primary}
          />
          <Text style={s.deskButtonText}>Desk</Text>
        </Pressable>
      )}

      {right ?? <SyncPill />}
    </View>
  );
}

export function TabBar() {
  const { bootstrap, persona } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const tabs = persona ? (bootstrap?.tabs?.[persona] ?? []) : [];
  if (!tabs.length) return null;

  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, space.sm + 2) }]}>
      {tabs.map((tab) => {
        const target = `/(app)/${tab.route}`;
        const active = pathname === `/${tab.route}` || pathname.endsWith(`/${tab.route}`);

        return (
          <Pressable
            key={tab.route}
            onPress={() => router.replace(target as never)}
            style={s.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={ICONS[tab.icon] ?? 'ellipse-outline'}
              size={21}
              color={active ? colors.primary : colors.placeholder}
            />
            <Text style={[s.tabLabel, { color: active ? colors.primary : colors.placeholder }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deskButton: {
  height: 34,
  paddingHorizontal: 11,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: '#F9FAFB',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  },

  deskButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 11.5, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.sm,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 5 },
  tabLabel: { fontSize: 10.5, fontWeight: '700' },
});
