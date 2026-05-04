import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import Toast from 'react-native-toast-message';
import { useColorScheme } from 'nativewind';
import { createMessage, getMyCrowds } from '@/services/api';
import { CreateMessagePayload, Crowd, FeedSource, TabNavigationProp } from '@/types';
import { useLocation, LocationFetchError } from '@/hooks/useLocation';
import { ThemedSlider } from '@/components/ThemedSlider';
import { ReachPreview } from '@/components/ReachPreview';
import { PrimaryButton } from '@/components/Buttons';
import { FeedSourceSelector } from '@/components/FeedSourceSelector';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CharacterCounter } from '@/components/CharacterCounter';
import { formatLifespan, formatReach } from '@/utils/formatters';

const MAX_TEXT_LENGTH = 120;
const REACH_MIN = 0.1;
const REACH_MAX = 5;
const LIFESPAN_MIN = 5;
const LIFESPAN_MAX = 720;

interface FormData {
  text: string;
  reachKm: number;
  lifespanMin: number;
}

// Slider axis is 0..1; product values are km / min. Conversion is linear so
// the thumb position matches the value's intuitive position. Snapping happens
// in the position→value direction with a coarser grid above the breakpoint.
//
// Reach:    0.1-km steps under 1 km, 0.5-km steps from 1 km up.
// Lifespan: 1-min steps under 60 min, 5-min steps from 60 min up.
const sliderToReach = (s: number): number => {
  const raw = REACH_MIN + s * (REACH_MAX - REACH_MIN);
  if (raw < 1) return Math.round(raw * 10) / 10;
  return Math.round(raw * 2) / 2;
};
const reachToSlider = (km: number): number =>
  (km - REACH_MIN) / (REACH_MAX - REACH_MIN);

const sliderToLifespan = (s: number): number => {
  const raw = LIFESPAN_MIN + s * (LIFESPAN_MAX - LIFESPAN_MIN);
  if (raw < 60) return Math.round(raw);
  return Math.round(raw / 5) * 5;
};
const lifespanToSlider = (min: number): number =>
  (min - LIFESPAN_MIN) / (LIFESPAN_MAX - LIFESPAN_MIN);

export const CreateMessageScreen: React.FC = () => {
  const navigation = useNavigation<TabNavigationProp>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const placeholderColor = isDark ? '#5A554B' : '#A09B91';
  const selectionColor = isDark ? '#D08454' : '#B85A2C';

  type SubmitState = 'idle' | 'locating' | 'submitting';
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [showLocatingLabel, setShowLocatingLabel] = useState(false);
  const locatingLabelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (locatingLabelTimer.current) clearTimeout(locatingLabelTimer.current);
    };
  }, []);
  const { getFreshLocation } = useLocation();

  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<FeedSource>({ id: null, name: 'Everyone' });

  const loadCrowds = useCallback(async () => {
    try {
      const data = await getMyCrowds();
      setCrowds(data);
    } catch (error) {
      console.error('Error loading crowds:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCrowds();
    }, [loadCrowds])
  );

  const { control, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: { text: '', reachKm: 1, lifespanMin: 60 },
  });

  const text = watch('text');
  const reachKm = watch('reachKm');
  const lifespanMin = watch('lifespanMin');
  const charCount = text?.length ?? 0;
  const isEmpty = (text ?? '').trim().length === 0;

  const showLocationError = useCallback(async (error: LocationFetchError) => {
    if (error === 'permission_denied') {
      // Try in-app re-prompt first; if hard-revoked, OS returns the same status
      // and we point the user to Settings.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        Toast.show({
          type: 'info',
          text1: 'Permission granted',
          text2: 'Tap Post again to share.',
        });
        return;
      }
      Alert.alert(
        'Location required',
        'Crowd needs location access to post. Open Settings to grant permission.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    Toast.show({
      type: 'error',
      text1: "Couldn't get your location",
      text2: 'Make sure GPS is on, then try again.',
    });
  }, []);

  const onSubmit = async (data: FormData) => {
    if (data.text.trim().length === 0) {
      Toast.show({ type: 'error', text1: 'Empty post', text2: 'Write something first.' });
      return;
    }

    setSubmitState('locating');
    locatingLabelTimer.current = setTimeout(() => setShowLocatingLabel(true), 1000);

    const result = await getFreshLocation();

    if (locatingLabelTimer.current) {
      clearTimeout(locatingLabelTimer.current);
      locatingLabelTimer.current = null;
    }
    setShowLocatingLabel(false);

    if (!result.ok) {
      setSubmitState('idle');
      showLocationError(result.error);
      return;
    }

    setSubmitState('submitting');
    try {
      const payload: CreateMessagePayload = {
        text: data.text.trim(),
        duration: Math.round(data.lifespanMin),
        distance: Math.round(data.reachKm * 1000),
      };
      await createMessage(payload, {
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        crowdId: selectedTarget.id || undefined,
      });
      Toast.show({ type: 'success', text1: 'Posted', text2: 'It’s out there.' });
      setTimeout(() => {
        navigation.navigate('Feed');
        reset();
      }, 400);
    } catch (error) {
      console.error('Error creating message:', error);
      Toast.show({ type: 'error', text1: 'Failed to post', text2: 'Try again.' });
    } finally {
      setSubmitState('idle');
    }
  };

  const isBusy = submitState !== 'idle';
  const submitDisabled = isBusy || isEmpty;
  const submitLabel =
    submitState === 'submitting'
      ? 'Posting…'
      : submitState === 'locating' && showLocatingLabel
        ? 'Locating…'
        : 'Post';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper dark:bg-paper-d"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ScreenHeader title="New post" />

        <FeedSourceSelector
          sources={[
            { id: null, name: 'Everyone' },
            ...crowds.map((c) => ({ id: c.id, name: c.name })),
          ]}
          selectedSource={selectedTarget}
          onSourceChange={setSelectedTarget}
        />

        <View className="px-screen-x" style={{ gap: 18, marginTop: 14 }}>
          {/* Compose */}
          <View className="pb-3 border-b border-rule dark:border-rule-d">
            <Controller
              control={control}
              name="text"
              rules={{ maxLength: MAX_TEXT_LENGTH }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  placeholder="What do you want to say?"
                  placeholderTextColor={placeholderColor}
                  selectionColor={selectionColor}
                  multiline
                  value={value}
                  onChangeText={onChange}
                  maxLength={MAX_TEXT_LENGTH}
                  className="font-serif text-compose text-ink dark:text-ink-d"
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              )}
            />
            <CharacterCounter
              current={charCount}
              limit={MAX_TEXT_LENGTH}
              style={{ marginTop: 6 }}
            />
          </View>

          {/* Reach + lifespan preview */}
          <View>
            <ReachPreview reachKm={reachKm} lifespanMin={lifespanMin} />
            <View
              className="flex-row justify-between"
              style={{ marginTop: 8 }}
            >
              <Text className="font-sans text-meta text-dust dark:text-dust-d">
                Reach{' '}
                <Text className="font-sans-medium text-ink dark:text-ink-d">
                  {formatReach(reachKm)}
                </Text>
              </Text>
              <Text className="font-sans text-meta text-dust dark:text-dust-d">
                Lifespan{' '}
                <Text className="font-sans-medium text-ink dark:text-ink-d">
                  {formatLifespan(lifespanMin)}
                </Text>
              </Text>
            </View>
          </View>

          {/* Reach slider */}
          <View>
            <View
              className="flex-row justify-between"
              style={{ marginBottom: 4 }}
            >
              <Text className="font-sans text-meta text-dust dark:text-dust-d">
                Reach
              </Text>
              <Text className="font-sans-medium text-meta text-ink dark:text-ink-d">
                {formatReach(reachKm)}
              </Text>
            </View>
            <Controller
              control={control}
              name="reachKm"
              render={({ field: { onChange, value } }) => (
                <ThemedSlider
                  minimumValue={0}
                  maximumValue={1}
                  value={reachToSlider(value)}
                  onValueChange={(s) => onChange(sliderToReach(s))}
                />
              )}
            />
          </View>

          {/* Lifespan slider */}
          <View>
            <View
              className="flex-row justify-between"
              style={{ marginBottom: 4 }}
            >
              <Text className="font-sans text-meta text-dust dark:text-dust-d">
                Lifespan
              </Text>
              <Text className="font-sans-medium text-meta text-ink dark:text-ink-d">
                {formatLifespan(lifespanMin)}
              </Text>
            </View>
            <Controller
              control={control}
              name="lifespanMin"
              render={({ field: { onChange, value } }) => (
                <ThemedSlider
                  minimumValue={0}
                  maximumValue={1}
                  value={lifespanToSlider(value)}
                  onValueChange={(s) => onChange(sliderToLifespan(s))}
                />
              )}
            />
          </View>

          {/* Send block */}
          <View style={{ marginTop: 6 }}>
            <View style={{ opacity: submitDisabled ? 0.5 : 1 }}>
              <PrimaryButton
                label={submitLabel}
                onPress={handleSubmit(onSubmit)}
                disabled={submitDisabled}
              />
            </View>
            <Text
              className="font-sans text-meta text-dust dark:text-dust-d"
              style={{ marginTop: 10, textAlign: 'center' }}
            >
              No account &middot; No record after expiration
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
