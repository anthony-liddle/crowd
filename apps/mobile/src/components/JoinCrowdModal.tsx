import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { ScannerView } from './ScannerView';
import { TapNfcModal } from './TapNfcModal';
import { ConfirmationCard, ConfirmationCrowd } from './ConfirmationCard';
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

type TokenInvite = Extract<CrowdInvite, { kind: 'token' }>;

// Internal flow state. Lives inside the single Modal so scanner ↔
// confirmation is a state transition, not a Modal-on-Modal handoff.
// iOS drops transparent-Modal presentations that overlap the dismissal
// animation of another Modal — the previous sibling-Modal design hit
// this consistently on real devices (see PR #69 / structural rewrite).
type FlowState =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'looking-up' }
  | { kind: 'confirming'; invite: TokenInvite; summary: ConfirmationCrowd }
  | { kind: 'joining-token'; invite: TokenInvite; summary: ConfirmationCrowd }
  | { kind: 'joining-open' };

export const JoinCrowdModal: React.FC<JoinCrowdModalProps> = ({
  visible,
  onClose,
  onJoined,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

  const [joinCode, setJoinCode] = useState('');
  const [flow, setFlow] = useState<FlowState>({ kind: 'idle' });
  const [nfcVisible, setNfcVisible] = useState(false);

  const trimmed = joinCode.trim();
  const busy =
    flow.kind === 'looking-up' ||
    flow.kind === 'joining-token' ||
    flow.kind === 'joining-open';
  const joinDisabled = busy || trimmed.length === 0;

  const close = () => {
    setJoinCode('');
    setFlow({ kind: 'idle' });
    onClose();
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

  const lookupAndConfirm = async (invite: TokenInvite) => {
    setFlow({ kind: 'looking-up' });
    try {
      const summary = await lookupCrowdToken(invite.token);
      setFlow({
        kind: 'confirming',
        invite,
        summary: {
          name: summary.name,
          isOpen: summary.isOpen,
          memberCount: summary.memberCount,
          expiresAt: summary.expiresAt,
        },
      });
    } catch (error) {
      showTokenError(error);
      setFlow({ kind: 'idle' });
    }
  };

  const consumeToken = async () => {
    if (flow.kind !== 'confirming') return;
    const { invite, summary } = flow;
    setFlow({ kind: 'joining-token', invite, summary });
    try {
      await joinCrowdWithToken(invite.token, invite.crowdId);
      Toast.show({ type: 'success', text1: 'Joined', text2: `You have joined "${summary.name}".` });
      onJoined();
      close();
    } catch (error) {
      showTokenError(error);
      setFlow({ kind: 'confirming', invite, summary });
    }
  };

  const joinOpen = async (crowdId: string) => {
    setFlow({ kind: 'joining-open' });
    try {
      await joinCrowd(crowdId);
      Toast.show({ type: 'success', text1: 'Joined', text2: 'You have joined the crowd.' });
      onJoined();
      close();
    } catch (error: any) {
      const message = error?.message?.includes('closed')
        ? 'This crowd is private — ask the owner for a QR or NFC code.'
        : error?.message?.includes('Already')
          ? 'You are already a member.'
          : 'Failed to join crowd';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
      setFlow({ kind: 'idle' });
    }
  };

  const handleJoinByCode = () => {
    if (!trimmed) return;
    const invite = parseCrowdInvite(trimmed);
    if (invite?.kind === 'token') {
      lookupAndConfirm(invite);
    } else {
      joinOpen(invite?.kind === 'open' ? invite.crowdId : trimmed);
    }
  };

  const handleScan = (raw: string) => {
    const invite = parseCrowdInvite(raw);
    if (!invite) {
      Toast.show({
        type: 'error',
        text1: 'Not a Crowd code',
        text2: "That doesn't look like a Crowd code.",
      });
      setFlow({ kind: 'idle' });
      return;
    }
    if (invite.kind === 'token') {
      lookupAndConfirm(invite);
    } else {
      joinOpen(invite.crowdId);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        {renderFlow(flow, {
          colors: c,
          joinCode,
          onChangeJoinCode: setJoinCode,
          onJoinByCode: handleJoinByCode,
          busy,
          joinDisabled,
          onScan: () => setFlow({ kind: 'scanning' }),
          onNfc: () => setNfcVisible(true),
          onClose: close,
          onScanResult: handleScan,
          onCancelScan: () => setFlow({ kind: 'idle' }),
          onConfirmToken: consumeToken,
          onCancelToken: () => setFlow({ kind: 'idle' }),
        })}
      </Modal>

      <TapNfcModal visible={nfcVisible} onClose={() => setNfcVisible(false)} />
    </>
  );
};

interface RenderHandlers {
  colors: typeof COLORS.light;
  joinCode: string;
  onChangeJoinCode: (v: string) => void;
  onJoinByCode: () => void;
  busy: boolean;
  joinDisabled: boolean;
  onScan: () => void;
  onNfc: () => void;
  onClose: () => void;
  onScanResult: (raw: string) => void;
  onCancelScan: () => void;
  onConfirmToken: () => void;
  onCancelToken: () => void;
}

function renderFlow(flow: FlowState, h: RenderHandlers) {
  switch (flow.kind) {
    case 'scanning':
      return (
        <ScannerView active onCancel={h.onCancelScan} onScan={h.onScanResult} />
      );
    case 'looking-up':
      return <LookingUpView emberHex={h.colors.ember} />;
    case 'confirming':
      return (
        <ConfirmationCard
          crowd={flow.summary}
          joining={false}
          onConfirm={h.onConfirmToken}
          onCancel={h.onCancelToken}
        />
      );
    case 'joining-token':
      // Same card the user just confirmed from, with the joining flag
      // set so they see continuity rather than a flash to a loader.
      return (
        <ConfirmationCard
          crowd={flow.summary}
          joining
          onConfirm={() => undefined}
          onCancel={() => undefined}
        />
      );
    case 'joining-open':
      return <LookingUpView emberHex={h.colors.ember} />;
    case 'idle':
    default:
      return (
        <IdleSheet
          colors={h.colors}
          joinCode={h.joinCode}
          onChangeJoinCode={h.onChangeJoinCode}
          onJoin={h.onJoinByCode}
          busy={h.busy}
          joinDisabled={h.joinDisabled}
          onScan={h.onScan}
          onNfc={h.onNfc}
          onClose={h.onClose}
        />
      );
  }
}

const LookingUpView: React.FC<{ emberHex: string }> = ({ emberHex }) => (
  <View
    className="flex-1 items-center justify-center"
    style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
  >
    <ActivityIndicator color={emberHex} />
  </View>
);

interface IdleSheetProps {
  colors: typeof COLORS.light;
  joinCode: string;
  onChangeJoinCode: (v: string) => void;
  onJoin: () => void;
  busy: boolean;
  joinDisabled: boolean;
  onScan: () => void;
  onNfc: () => void;
  onClose: () => void;
}

const IdleSheet: React.FC<IdleSheetProps> = ({
  colors,
  joinCode,
  onChangeJoinCode,
  onJoin,
  busy,
  joinDisabled,
  onScan,
  onNfc,
  onClose,
}) => (
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
          style={{ paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
          placeholder="Paste link or code"
          placeholderTextColor={colors.dust2}
          selectionColor={colors.ember}
          value={joinCode}
          onChangeText={onChangeJoinCode}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text
          className="font-sans text-dust dark:text-dust-d"
          style={{ fontSize: 11, marginTop: 6, marginBottom: 20 }}
        >
          Either the full link or just the code at the end works.
        </Text>

        <Separator label="Or join in person" rule={colors.rule} />

        <View className="flex-row" style={{ gap: 10, marginTop: 16, marginBottom: 24 }}>
          <View className="flex-1">
            <IconQuietButton
              label="Scan QR"
              icon={<QrIcon size={16} color={colors.ember} />}
              onPress={onScan}
            />
          </View>
          <View className="flex-1">
            <IconQuietButton
              label="Tap NFC"
              icon={<NfcIcon size={16} color={colors.ember} />}
              onPress={onNfc}
            />
          </View>
        </View>

        <View className="flex-row" style={{ gap: 10 }}>
          <View className="flex-1">
            <QuietButton label="Cancel" onPress={onClose} />
          </View>
          <View className="flex-1" style={{ opacity: joinDisabled ? 0.5 : 1 }}>
            <PrimaryButton
              label={busy ? 'Joining…' : 'Join'}
              onPress={onJoin}
              disabled={joinDisabled}
            />
          </View>
        </View>
      </Pressable>
    </Pressable>
  </KeyboardAvoidingView>
);

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
