import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useAuth } from '../../src/auth/AuthContext';
import { TabBar } from '../../src/ui/Chrome';
import { Loading } from '../../src/ui/kit';
import { colors } from '../../src/ui/theme';

export default function AppLayout() {
  const {
    ready,
    credentials,
  } = useAuth();

  /*
   * AuthProvider is still checking:
   *
   * Frappe Desk browser session
   *        ↓
   * get_logged_user
   *        ↓
   * Van Sales bootstrap
   *
   * Do NOT redirect to login during this time.
   */
  if (!ready) {
    return <Loading />;
  }

  /*
   * Authentication finished but no
   * Frappe/Van Sales session exists.
   */
  if (!credentials) {
    return <Redirect href="/login" />;
  }

  /*
   * Authentication successful.
   * Render the requested Van Sales route.
   */
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
      }}
    >
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      <TabBar />
    </View>
  );
}