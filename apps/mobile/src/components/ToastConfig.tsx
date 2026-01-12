import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';

/**
 * Custom Toast Configuration
 * Provides styled toast components for success, error, and info types
 */

export const toastConfig = {
  /**
   * Success Toast - Green theme
   */
  success: ({ text1, text2 }: BaseToastProps) => (
    <View
      style={[
        styles.toastContainer,
        styles.successContainer,
        { height: text2 ? 80 : 60 },
      ]}
    >
      <View style={styles.contentContainer}>
        <Text style={[styles.text1, styles.successText1]}>
          {text1}
        </Text>
        {text2 && (
          <Text style={[styles.text2, styles.successText2]}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),

  /**
   * Error Toast - Red theme
   */
  error: ({ text1, text2 }: BaseToastProps) => (
    <View
      style={[
        styles.toastContainer,
        styles.errorContainer,
        { height: text2 ? 80 : 60 },
      ]}
    >
      <View style={styles.contentContainer}>
        <Text style={[styles.text1, styles.errorText1]}>
          {text1}
        </Text>
        {text2 && (
          <Text style={[styles.text2, styles.errorText2]}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),

  /**
   * Info Toast - Blue theme
   */
  info: ({ text1, text2 }: BaseToastProps) => (
    <View
      style={[
        styles.toastContainer,
        styles.infoContainer,
        { height: text2 ? 80 : 60 },
      ]}
    >
      <View style={styles.contentContainer}>
        <Text style={[styles.text1, styles.infoText1]}>
          {text1}
        </Text>
        {text2 && (
          <Text style={[styles.text2, styles.infoText2]}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    width: '95%',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successContainer: {
    backgroundColor: '#F0FDF4', // green-50
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E', // green-500
  },
  errorContainer: {
    backgroundColor: '#FEF2F2', // red-50
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444', // red-500
  },
  infoContainer: {
    backgroundColor: '#EFF6FF', // blue-50
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6', // blue-500
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  text1: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  text2: {
    fontSize: 14,
    marginTop: 2,
  },
  // Success toast text colors
  successText1: {
    color: '#14532D', // green-900
  },
  successText2: {
    color: '#15803D', // green-700
  },
  // Error toast text colors
  errorText1: {
    color: '#7F1D1D', // red-900
  },
  errorText2: {
    color: '#B91C1C', // red-700
  },
  // Info toast text colors
  infoText1: {
    color: '#1E3A8A', // blue-900
  },
  infoText2: {
    color: '#1D4ED8', // blue-700
  },
});
