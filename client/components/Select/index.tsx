import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: T[];
  onSelect: (value: T) => void;
  placeholder?: string;
}

export default function Select<T extends string>({
  label,
  value,
  options,
  onSelect,
  placeholder,
}: SelectProps<T>) {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const [visible, setVisible] = useState(false);

  const handlePress = () => {
    setVisible(true);
  };

  const handleSelect = (option: T) => {
    onSelect(option);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TouchableOpacity
        style={styles.trigger}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <ThemedText
          variant="body"
          color={value ? theme.textPrimary : theme.textMuted}
          style={styles.triggerText}
        >
          {value || placeholder || '请选择'}
        </ThemedText>
        <FontAwesome6 name="chevron-down" size={16} color={theme.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          >
            <ThemedView level="default" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h4" color={theme.textPrimary}>
                  {label}
                </ThemedText>
                <TouchableOpacity onPress={() => setVisible(false)} activeOpacity={0.7}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.optionsList}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionItem,
                      value === option && styles.optionItemSelected,
                      value === option && { borderColor: theme.primary }
                    ]}
                    onPress={() => handleSelect(option)}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      variant="body"
                      color={value === option ? theme.primary : theme.textPrimary}
                    >
                      {option}
                    </ThemedText>
                    {value === option && (
                      <FontAwesome6 name="check" size={16} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemedView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
