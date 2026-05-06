import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import { createProximityToken } from '@/services/api';
import { QuietButton } from './Buttons';

interface PrivateInviteSheetProps {
  visible: boolean;
  crowdId: string;
  crowdName: string;
  onClose: () => void;
}

const COLORS = {
  light: { ink: '#1F1A14', paper: '#F7F1E1', rule: '#E0DAC9' },
  dark: { ink: '#F0E9D7', paper: '#15130F', rule: '#2A2724' },
};

interface TokenState {
  token: string;
  expiresAt: Date;
}

export const PrivateInviteSheet: React.FC<PrivateInviteSheetProps> = ({
  visible,
  crowdId,
  crowdName,
  onClose,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

  const [token, setToken] = useState<TokenState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestIdRef = useRef(0);

  const mint = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const fresh = await createProximityToken(crowdId);
      if (requestIdRef.current !== requestId) return;
      setToken(fresh);
      setNow(Date.now());
    } catch {
      if (requestIdRef.current !== requestId) return;
      setError('Could not generate a code. Check your connection and try again.');
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [crowdId]);

  // Mint on open; clear on close so a stale code doesn't flash next time.
  useEffect(() => {
    if (visible) {
      mint();
    } else {
      setToken(null);
      setError(null);
      requestIdRef.current++;
    }
  }, [visible, mint]);

  // Tick once a second while a live token is on screen so the countdown
  // updates. Stops once expired to avoid pointless re-renders.
  useEffect(() => {
    if (!visible || !token) return;
    const remaining = token.expiresAt.getTime() - Date.now();
    if (remaining <= 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [visible, token]);

  const remainingMs = token ? Math.max(0, token.expiresAt.getTime() - now) : 0;
  const expired = !!token && remainingMs <= 0;
  const payload = token ? `crowd://join-token/${token.token}?cid=${crowdId}` : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-paper dark:bg-paper-d rounded-t-[20px] px-screen-x pt-5 pb-7"
        >
          <View className="self-center w-9 h-1 bg-rule dark:bg-rule-d rounded-full mb-4" />
          <Text
            className="font-serif text-title text-ink dark:text-ink-d"
            style={{ marginBottom: 8 }}
            numberOfLines={1}
          >
            Invite to {crowdName}
          </Text>
          <Text
            className="font-sans text-body text-dust dark:text-dust-d"
            style={{ marginBottom: 20, lineHeight: 20 }}
          >
            Show this code to someone in person to add them. Each code works
            once, and expires after 5 minutes.
          </Text>

          <View
            className="self-center items-center justify-center bg-paper-2 dark:bg-paper-2-d rounded-md"
            style={{
              width: 280,
              height: 280,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: c.rule,
            }}
          >
            {loading && !token && <ActivityIndicator color={c.ink} />}
            {!loading && error && (
              <Text
                className="font-sans text-body text-dust dark:text-dust-d"
                style={{ textAlign: 'center', paddingHorizontal: 24 }}
              >
                {error}
              </Text>
            )}
            {token && (
              <View style={{ opacity: expired ? 0.25 : 1 }}>
                <QRCode
                  value={payload}
                  size={248}
                  color={c.ink}
                  backgroundColor="transparent"
                />
              </View>
            )}
          </View>

          <Text
            className="font-sans text-meta text-dust dark:text-dust-d self-center"
            style={{ marginBottom: 20 }}
          >
            {error
              ? ' '
              : expired
                ? 'Code expired — generate a new one'
                : token
                  ? `Expires in ${formatRemaining(remainingMs)}`
                  : ' '}
          </Text>

          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <QuietButton label="Done" onPress={onClose} />
            </View>
            <View className="flex-1" style={{ opacity: loading ? 0.5 : 1 }}>
              <QuietButton
                label={loading ? 'Generating…' : error ? 'Try again' : 'Generate new code'}
                onPress={() => {
                  if (loading) return;
                  mint().catch(() =>
                    Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to generate code' }),
                  );
                }}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
