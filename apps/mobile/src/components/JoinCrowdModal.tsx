import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import Toast from 'react-native-toast-message';
import { joinCrowd, joinCrowdWithToken, lookupCrowdToken } from '@/services/api';
import { PrimaryButton, QuietButton } from './Buttons';
import { ScanQrScreen } from './ScanQrScreen';
import { TapNfcModal } from './TapNfcModal';
import { JoinCrowdConfirmation, ConfirmationCrowd } from './JoinCrowdConfirmation';
import { parseCrowdInvite, CrowdInvite } from '@/utils/crowdInvite';
import { QrIcon, NfcIcon } from './icons';

interface JoinCrowdModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
}

const COLORS = {
  light: { ember: '#B85A2C', dust2: '#A09B91', rule: '#E0DAC9' },
  dark: { ember: '#D08454', dust2: '#5A554B', rule: '#2A2724' },
};

export const JoinCrowdModal: React.FC<JoinCrowdModalProps> = ({
  visible,
  onClose,
  onJoined,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);
  const [nfcVisible, setNfcVisible] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationCrowd | null>(null);
  // Pending invite — populated when a token lookup succeeded but the user
  // hasn't confirmed yet. Cleared on Cancel or after a successful consume.
  const [pendingTokenInvite, setPendingTokenInvite] = useState<
    Extract<CrowdInvite, { kind: 'token' }> | null
  >(null);

  const trimmed = joinCode.trim();
  const joinDisabled = joining || trimmed.length === 0;

  const reset = () => {
    setJoinCode('');
    setJoining(false);
    setPendingTokenInvite(null);
    setConfirmation(null);
  };

  const showTokenError = (error: any) => {
    const tokenErr = error?.message?.includes('expired')
      || error?.message?.includes('used')
      || error?.message?.includes('Token')
      || error?.message?.includes('Invalid token');
    Toast.show({
      type: 'error',
      text1: tokenErr ? 'Code unavailable' : 'Failed to join',
      text2: tokenErr
        ? 'That code has expired or already been used. Ask the owner for a new one.'
        : 'Failed to join crowd.',
    });
  };

  const startTokenLookup = async (invite: Extract<CrowdInvite, { kind: 'token' }>) => {
    try {
      const summary = await lookupCrowdToken(invite.token);
      setPendingTokenInvite(invite);
      setConfirmation({
        name: summary.name,
        isOpen: summary.isOpen,
        memberCount: summary.memberCount,
        expiresAt: summary.expiresAt,
      });
    } catch (error: any) {
      showTokenError(error);
    }
  };

  const consumePendingToken = async () => {
    if (!pendingTokenInvite) return;
    setJoining(true);
    try {
      const summary = await joinCrowdWithToken(pendingTokenInvite.token, pendingTokenInvite.crowdId);
      Toast.show({ type: 'success', text1: 'Joined', text2: `You have joined "${summary.name}".` });
      reset();
      onJoined();
      onClose();
    } catch (error: any) {
      showTokenError(error);
      setJoining(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!trimmed) return;
    const invite = parseCrowdInvite(trimmed);

    if (invite?.kind === 'token') {
      // Tokens always preview before consuming.
      await startTokenLookup(invite);
      return;
    }

    setJoining(true);
    try {
      const crowdId = invite?.kind === 'open' ? invite.crowdId : trimmed;
      await joinCrowd(crowdId);
      Toast.show({ type: 'success', text1: 'Joined', text2: 'You have joined the crowd.' });
      reset();
      onJoined();
      onClose();
    } catch (error: any) {
      const message = error?.message?.includes('closed')
        ? 'This crowd is private — ask the owner for a QR or NFC code.'
        : error?.message?.includes('Already')
          ? 'You are already a member.'
          : 'Failed to join crowd';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setJoining(false);
    }
  };

  const handleScanResult = (raw: string) => {
    const invite = parseCrowdInvite(raw);
    setScanVisible(false);
    if (!invite) {
      Toast.show({
        type: 'error',
        text1: 'Not a Crowd code',
        text2: "That doesn't look like a Crowd code.",
      });
      return;
    }
    // Defer the follow-up until the scanner Modal has fully dismissed.
    // iOS drops a transparent Modal that's presented while a fullScreen
    // Modal is still mid-dismissal, leaving the screen frozen with no
    // confirmation surfaced. 350ms covers the slide-down animation.
    setTimeout(() => {
      if (invite.kind === 'token') {
        startTokenLookup(invite);
      } else {
        joinOpenCrowdById(invite.crowdId);
      }
    }, 350);
  };

  const joinOpenCrowdById = async (crowdId: string) => {
    setJoining(true);
    try {
      await joinCrowd(crowdId);
      Toast.show({ type: 'success', text1: 'Joined', text2: 'You have joined the crowd.' });
      reset();
      onJoined();
      onClose();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message?.includes('Already')
          ? 'You are already a member.'
          : 'Failed to join crowd.',
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !scanVisible && !nfcVisible && !confirmation}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
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
              style={{ marginBottom: 16 }}
            >
              Join a crowd
            </Text>

            <Text className="font-sans text-meta text-dust dark:text-dust-d mb-2">
              Invite code
            </Text>
            <TextInput
              className="bg-paper-2 dark:bg-paper-2-d border border-rule dark:border-rule-d rounded-md font-sans text-ink dark:text-ink-d"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
              }}
              placeholder="Paste link or code"
              placeholderTextColor={c.dust2}
              selectionColor={c.ember}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text
              className="font-sans text-dust dark:text-dust-d"
              style={{ fontSize: 11, marginTop: 6, marginBottom: 20 }}
            >
              Either the full link or just the code at the end works.
            </Text>

            <Separator label="Or join in person" rule={c.rule} />

            <View className="flex-row" style={{ gap: 10, marginTop: 16, marginBottom: 24 }}>
              <View className="flex-1">
                <IconQuietButton
                  label="Scan QR"
                  icon={<QrIcon size={16} color={c.ember} />}
                  onPress={() => setScanVisible(true)}
                />
              </View>
              <View className="flex-1">
                <IconQuietButton
                  label="Tap NFC"
                  icon={<NfcIcon size={16} color={c.ember} />}
                  onPress={() => setNfcVisible(true)}
                />
              </View>
            </View>

            <View className="flex-row" style={{ gap: 10 }}>
              <View className="flex-1">
                <QuietButton label="Cancel" onPress={onClose} />
              </View>
              <View className="flex-1" style={{ opacity: joinDisabled ? 0.5 : 1 }}>
                <PrimaryButton
                  label={joining ? 'Joining…' : 'Join'}
                  onPress={handleJoinByCode}
                  disabled={joinDisabled}
                />
              </View>
            </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <ScanQrScreen
        visible={scanVisible}
        onCancel={() => setScanVisible(false)}
        onScan={handleScanResult}
      />

      <TapNfcModal visible={nfcVisible} onClose={() => setNfcVisible(false)} />

      <JoinCrowdConfirmation
        crowd={confirmation}
        joining={joining}
        onConfirm={consumePendingToken}
        onCancel={() => {
          setConfirmation(null);
          setPendingTokenInvite(null);
        }}
      />
    </>
  );
};

const Separator: React.FC<{ label: string; rule: string }> = ({ label, rule }) => (
  <View className="flex-row items-center" style={{ gap: 10 }}>
    <View style={{ flex: 1, height: 1, backgroundColor: rule }} />
    <Text
      className="font-serif-italic text-dust dark:text-dust-d"
      style={{ fontSize: 12 }}
    >
      {label}
    </Text>
    <View style={{ flex: 1, height: 1, backgroundColor: rule }} />
  </View>
);

const IconQuietButton: React.FC<{ label: string; icon: React.ReactNode; onPress: () => void }> = ({
  label,
  icon,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center justify-center border border-rule dark:border-rule-d rounded-md active:opacity-60"
    style={{ paddingVertical: 12, gap: 8 }}
  >
    {icon}
    <Text className="text-ink dark:text-ink-d font-sans text-body">{label}</Text>
  </Pressable>
);
