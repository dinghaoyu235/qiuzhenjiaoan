import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { Theme } from '@/constants/theme';
import { createStyles } from './styles';

interface AdjustmentModalProps {
  visible: boolean;
  adjustingSection: 'intro' | 'activity' | 'summary' | null;
  adjustingOption: { type: 'intro' | 'activity' | 'summary'; index: number; data: any } | null;
  adjustmentRequest: string;
  isAdjusting: boolean;
  isRecording: boolean;
  isRecognizing: boolean;
  expandedSections: any;
  onRequestClose: () => void;
  onForceClose: () => void;
  onChangeRequest: (text: string) => void;
  onAdjust: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export default function AdjustmentModal({
  visible,
  adjustingSection,
  adjustingOption,
  adjustmentRequest,
  isAdjusting,
  isRecording,
  isRecognizing,
  expandedSections,
  onRequestClose,
  onForceClose,
  onChangeRequest,
  onAdjust,
  onStartRecording,
  onStopRecording,
}: AdjustmentModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={onRequestClose}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalContentWrapper}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <ThemedText variant="h4" color={theme.textPrimary}>
                    {adjustingSection ? (
                      `AI个性化调整 - ${adjustingSection === 'intro' ? '导入阶段' : adjustingSection === 'activity' ? '课堂活动' : '总结阶段'}`
                    ) : (
                      `个性化调整 - ${adjustingOption?.type === 'intro' ? '导入阶段' : adjustingOption?.type === 'activity' ? '课堂活动' : '总结阶段'}`
                    )}
                  </ThemedText>
                  <TouchableOpacity onPress={onForceClose} activeOpacity={0.7}>
                    <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Modal Body */}
                {adjustingSection ? (
                  <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                    <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.modalSectionTitle}>
                      当前扩写内容
                    </ThemedText>
                    <View style={styles.currentOptionCard}>
                      <ThemedText variant="caption" color={theme.textSecondary} style={styles.currentOptionDesc}>
                        {expandedSections[adjustingSection]?.substring(0, 200)}...
                      </ThemedText>
                    </View>

                    <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.modalSectionTitle}>
                      您的调整需求
                    </ThemedText>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.adjustmentInput}
                        placeholder="请描述您希望如何调整这个环节，例如：'增加互动环节'、'更适合大班授课'、'增加动手操作机会'、'简化活动步骤'"
                        placeholderTextColor={theme.textMuted}
                        value={adjustmentRequest}
                        onChangeText={onChangeRequest}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={[
                          styles.voiceButton,
                          isRecording && styles.voiceButtonRecording,
                          isRecognizing && styles.voiceButtonRecognizing,
                        ]}
                        onPressIn={onStartRecording}
                        onPressOut={onStopRecording}
                        disabled={isRecognizing}
                        activeOpacity={0.7}
                      >
                        {isRecognizing ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                          <>
                            <FontAwesome6
                              name="microphone"
                              size={20}
                              color={isRecording ? '#fff' : theme.primary}
                            />
                            <ThemedText variant="smallMedium" color={isRecording ? '#fff' : theme.primary} style={styles.voiceButtonText}>
                              {isRecording ? '松手结束识别' : '按住说话'}
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    <ThemedText variant="caption" color={theme.textMuted} style={styles.hint}>
                      💡 提示：AI会根据您的需求，结合教育理念调整整个环节的扩写内容
                    </ThemedText>
                  </ScrollView>
                ) : (
                  <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                    <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.modalSectionTitle}>
                      当前活动设计
                    </ThemedText>
                    <View style={styles.currentOptionCard}>
                      <ThemedText variant="smallMedium" color={theme.textPrimary}>
                        {adjustingOption?.data.title}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textSecondary} style={styles.currentOptionDesc}>
                        {adjustingOption?.data.description}
                      </ThemedText>
                    </View>

                    <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.modalSectionTitle}>
                      您的调整需求
                    </ThemedText>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.adjustmentInput}
                        placeholder="请描述您希望如何调整这个活动，例如：'增加互动环节'、'更适合大班授课'、'增加动手操作机会'"
                        placeholderTextColor={theme.textMuted}
                        value={adjustmentRequest}
                        onChangeText={onChangeRequest}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={[
                          styles.voiceButton,
                          isRecording && styles.voiceButtonRecording,
                          isRecognizing && styles.voiceButtonRecognizing,
                        ]}
                        onPressIn={onStartRecording}
                        onPressOut={onStopRecording}
                        disabled={isRecognizing}
                        activeOpacity={0.7}
                      >
                        {isRecognizing ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                          <>
                            <FontAwesome6
                              name="microphone"
                              size={20}
                              color={isRecording ? '#fff' : theme.primary}
                            />
                            <ThemedText variant="smallMedium" color={isRecording ? '#fff' : theme.primary} style={styles.voiceButtonText}>
                              {isRecording ? '松手结束识别' : '按住说话'}
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    <ThemedText variant="caption" color={theme.textMuted} style={styles.hint}>
                      💡 提示：AI会根据您的需求，结合教育理念进行调整，保持活动时长和可行性
                    </ThemedText>
                  </ScrollView>
                )}

                {/* Modal Footer */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onRequestClose}
                    disabled={isAdjusting}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="smallMedium" color={theme.textPrimary}>
                      取消
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={onAdjust}
                    disabled={isAdjusting}
                    activeOpacity={0.7}
                  >
                    {isAdjusting ? (
                      <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
                    ) : (
                      <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
                        确认调整
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
