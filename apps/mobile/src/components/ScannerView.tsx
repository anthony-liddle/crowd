import React, { useEffect, useRef } from 'react';
import { Text, View, Linking, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useColorScheme } from 'nativewind';
import { PrimaryButton, QuietButton } from './Buttons';
import { ViewfinderCorners } from './icons';

interface ScannerViewProps {
  // True when this view is the active state in the parent flow. Used to
  // re-arm the duplicate-scan latch each time scanning resumes.
  active: boolean;
  onCancel: () => void;
  onScan: (raw: string) => void;
}

// Plain view (no Modal wrapper). Embedded inside JoinCrowdModal's single
// flow Modal so scanner ↔ confirmation is a state transition, not a
// modal-on-modal coordination — which iOS drops when transitions overlap.
export const ScannerView: React.FC<ScannerViewProps> = ({ active, onCancel, onScan }) => {
  const [permission, requestPermission] = useCameraPermissions();
  // Suppress duplicate scans: a single QR detection often fires multiple
  // events from the camera within the same frame. We latch on first hit.
  const lockedRef = useRef(false);

  useEffect(() => {
    if (active) lockedRef.current = false;
  }, [active]);

  if (!permission) return <View className="flex-1 bg-paper-d" />;

  if (permission.status !== 'granted') {
    return permission.canAskAgain ? (
      <PermissionPrompt onRequest={requestPermission} onCancel={onCancel} />
    ) : (
      <PermissionDenied onCancel={onCancel} />
    );
  }

  return (
    <ScannerSurface
      onScan={(raw) => {
        if (lockedRef.current) return;
        lockedRef.current = true;
        onScan(raw);
      }}
      onCancel={onCancel}
    />
  );
};

const ScannerSurface: React.FC<{ onScan: (raw: string) => void; onCancel: () => void }> = ({
  onScan,
  onCancel,
}) => {
  const window = Dimensions.get('window');
  // 70% of the shorter side so the viewfinder stays square on every device.
  const cutout = Math.min(window.width, window.height) * 0.7;
  const { colorScheme } = useColorScheme();
  const emberHex = colorScheme === 'dark' ? '#D08454' : '#B85A2C';

  return (
    <View className="flex-1 bg-paper-d">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(result) => onScan(result.data)}
      />

      {/* Dimming overlay with a transparent square in the middle. We achieve
          the cutout with four borders rather than a real mask because RN's
          masking primitives are platform-uneven. */}
      <View pointerEvents="none" style={{ ...StyleAbsoluteFill }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} />
        <View className="flex-row">
          <View style={{ width: (window.width - cutout) / 2, height: cutout, backgroundColor: 'rgba(0,0,0,0.7)' }} />
          <View style={{ width: cutout, height: cutout }}>
            <ViewfinderCorners size={cutout} color={emberHex} thickness={4} arm={32} />
          </View>
          <View style={{ width: (window.width - cutout) / 2, height: cutout, backgroundColor: 'rgba(0,0,0,0.7)' }} />
        </View>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} />
      </View>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 60, left: 0, right: 0, paddingHorizontal: 22 }}
      >
        <Text
          className="font-serif text-paper"
          style={{ fontSize: 22, color: '#F5F0E4' }}
        >
          Scan a Crowd code
        </Text>
        <Text
          className="font-sans"
          style={{ fontSize: 13, color: '#C9C2B2', marginTop: 6, lineHeight: 19 }}
        >
          Point your camera at the QR code shared by another member.
        </Text>
      </View>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', bottom: 40, left: 22, right: 22 }}
      >
        <QuietButton label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
};

const PermissionPrompt: React.FC<{ onRequest: () => void; onCancel: () => void }> = ({
  onRequest,
  onCancel,
}) => (
  <View className="flex-1 items-center justify-center px-screen-x bg-paper dark:bg-paper-d">
    <Text
      className="font-serif text-title text-ink dark:text-ink-d"
      style={{ textAlign: 'center', marginBottom: 12 }}
    >
      Scan a Crowd code
    </Text>
    <Text
      className="font-sans text-body text-dust dark:text-dust-d"
      style={{ textAlign: 'center', marginBottom: 24, maxWidth: 320 }}
    >
      Camera access lets you scan QR codes shared by other members.
    </Text>
    <View style={{ width: '100%', maxWidth: 280, gap: 10 }}>
      <PrimaryButton label="Continue" onPress={onRequest} />
      <QuietButton label="Cancel" onPress={onCancel} />
    </View>
  </View>
);

const PermissionDenied: React.FC<{ onCancel: () => void }> = ({ onCancel }) => (
  <View className="flex-1 items-center justify-center px-screen-x bg-paper dark:bg-paper-d">
    <Text
      className="font-serif text-title text-ink dark:text-ink-d"
      style={{ textAlign: 'center', marginBottom: 12 }}
    >
      Camera access needed
    </Text>
    <Text
      className="font-sans text-body text-dust dark:text-dust-d"
      style={{ textAlign: 'center', marginBottom: 24, maxWidth: 320 }}
    >
      Crowd needs camera access to scan QR codes. You can grant it in Settings.
    </Text>
    <View style={{ width: '100%', maxWidth: 280, gap: 10 }}>
      <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
      <QuietButton label="Cancel" onPress={onCancel} />
    </View>
  </View>
);

const StyleAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
