import { Redirect } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  View,
} from 'react-native';

import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/ui/theme';

export default function Index() {
  const {
    ready,
    credentials,
  } = useAuth();

  /*
   * Wait for AuthProvider to check
   * the existing Frappe Desk session.
   */
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  /*
   * Existing Frappe Desk session /
   * Van Sales session is available.
   */
  if (credentials) {
    return (
      <Redirect href="/(app)/van_home" />
    );
  }

  /*
   * No authenticated session.
   */
  return (
    <Redirect href="/login" />
  );
}