import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>((props, ref) => {
  const { style, ...rest } = props;
  const { theme } = useTheme();

  return (
    <RNTextInput
      ref={ref}
      style={[
        {
          color: theme.textPrimary,
          fontSize: 16,
          lineHeight: 24,
        },
        style,
      ]}
      placeholderTextColor={theme.textMuted}
      {...rest}
    />
  );
});

TextInput.displayName = 'TextInput';
