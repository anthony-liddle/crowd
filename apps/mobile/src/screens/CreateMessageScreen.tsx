import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import Toast from 'react-native-toast-message';
import { Controller, useForm } from 'react-hook-form';
import { createMessage, getMyCrowds } from '@/services/api';
import { CreateMessagePayload, Crowd, FeedSource, TabNavigationProp } from '@/types';
import { CharacterCounter } from '@/components/CharacterCounter';
import { PageHeader } from '@/components/PageHeader';
import { FeedSourceSelector } from '@/components/FeedSourceSelector';
import { formatDuration } from '@/utils/formatters';
import { useLocation } from '@/hooks/useLocation';

/**
 * CreateMessageScreen Component
 * Form for creating new messages with validation
 */
interface FormData {
  text: string;
  duration: number; // in minutes
  distance: number; // in meters
}

const MIN_DURATION = 5; // 5 minutes
const MAX_DURATION = 720; // 12 hours (720 minutes)
const MIN_DISTANCE = 1000; // 1000 meters
const MAX_DISTANCE = 5000; // 5000 meters
const MAX_TEXT_LENGTH = 120;

export const CreateMessageScreen: React.FC = () => {
  const navigation = useNavigation<TabNavigationProp>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { location, errorMsg: locationError, loading: locationLoading } = useLocation();

  // Crowd selector state
  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<FeedSource>({ id: null, name: 'Everyone' });

  // Load crowds for selector
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

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      text: '',
      duration: 60, // Default: 1 hour
      distance: 2500, // Default: 2.5 km
    },
  });

  const textValue = watch('text');
  const durationValue = watch('duration');
  const distanceValue = watch('distance');

  /**
   * Handle form submission
   */
  const onSubmit = async (data: FormData) => {
    if (locationLoading) {
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Getting location...' });
      return;
    }

    if (!location && !locationError) {
      // Should wait for location...
      return;
    }

    if (locationError) {
      Toast.show({ type: 'error', text1: 'Location Error', text2: locationError });
      return;
    }

    if (data.text.trim().length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Message text cannot be empty',
      });
      return;
    }

    if (data.text.length > MAX_TEXT_LENGTH) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: `Message must be ${MAX_TEXT_LENGTH} characters or less`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateMessagePayload = {
        text: data.text.trim(),
        duration: Math.round(data.duration),
        distance: parseFloat(data.distance.toFixed(1)),
      };

      await createMessage(payload, location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        crowdId: selectedTarget.id || undefined,
      } : undefined);

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Success!',
        text2: 'Your message has been posted',
        position: 'top',
      });

      // Navigate back to feed
      setTimeout(() => {
        navigation.navigate('Feed');

        // Clear form
        reset();
      }, 500);
    } catch (error) {
      console.error('Error creating message:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create message. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <PageHeader title="Create Post" />
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40, }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            className="px-4 pt-4"
          >
            {/* Post Target Selector */}
            <FeedSourceSelector
              sources={[
                { id: null, name: 'Everyone' },
                ...crowds.map(c => ({ id: c.id, name: c.name }))
              ]}
              selectedSource={selectedTarget}
              onSourceChange={setSelectedTarget}
              label="Post to"
              globalLabel="Everyone (Global)"
              title="Post to..."
              containerClassName="mb-6"
            />

            {/* Message Text Input */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Message
                </Text>
                <CharacterCounter
                  current={textValue?.length || 0}
                  limit={MAX_TEXT_LENGTH}
                />
              </View>
              <Controller
                control={control}
                name="text"
                rules={{
                  required: 'Message text is required',
                  maxLength: {
                    value: MAX_TEXT_LENGTH,
                    message: `Message must be ${MAX_TEXT_LENGTH} characters or less`,
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg p-4 text-base text-gray-900 min-h-[100px]"
                    placeholder="What's on your mind?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    value={value}
                    onChangeText={onChange}
                    maxLength={MAX_TEXT_LENGTH}
                    style={{ textAlignVertical: 'top' }}
                  />
                )}
              />
              {errors.text && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.text.message}
                </Text>
              )}
            </View>

            {/* Duration Slider */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Active Duration
                </Text>
                <Text className="text-sm font-semibold text-blue-600">
                  {formatDuration(Math.round(durationValue || 60))}
                </Text>
              </View>
              <Controller
                control={control}
                name="duration"
                render={({ field: { onChange, value } }) => (
                  <View className="bg-white rounded-lg p-4 border border-gray-300">
                    <Slider
                      minimumValue={MIN_DURATION}
                      maximumValue={MAX_DURATION}
                      step={5}
                      value={value}
                      onValueChange={onChange}
                      minimumTrackTintColor="#3B82F6"
                      maximumTrackTintColor="#E5E7EB"
                      thumbTintColor="#3B82F6"
                    />
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-xs text-gray-500">{MIN_DURATION}m</Text>
                      <Text className="text-xs text-gray-500">{MAX_DURATION / 60}h</Text>
                    </View>
                  </View>
                )}
              />
            </View>

            {/* Distance Slider */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Distance Radius
                </Text>
                <Text className="text-sm font-semibold text-blue-600">
                  {(distanceValue / 1000 || 2500 / 1000).toFixed(1)} km
                </Text>
              </View>
              <Controller
                control={control}
                name="distance"
                render={({ field: { onChange, value } }) => (
                  <View className="bg-white rounded-lg p-4 border border-gray-300">
                    <Slider
                      minimumValue={MIN_DISTANCE}
                      maximumValue={MAX_DISTANCE}
                      step={0.1}
                      value={value}
                      onValueChange={onChange}
                      minimumTrackTintColor="#3B82F6"
                      maximumTrackTintColor="#E5E7EB"
                      thumbTintColor="#3B82F6"
                    />
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-xs text-gray-500">{MIN_DISTANCE / 1000} km</Text>
                      <Text className="text-xs text-gray-500">{MAX_DISTANCE / 1000} km</Text>
                    </View>
                  </View>
                )}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className={`bg-blue-600 rounded-lg p-4 items-center ${isSubmitting ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-semibold text-base">
                {isSubmitting ? 'Posting...' : 'Post Message'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};
