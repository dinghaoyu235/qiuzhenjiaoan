import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthProvider } from "@/contexts/AuthContext";
import { ColorSchemeProvider } from '@/hooks/useColorScheme';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  // 添加其它想暂时忽略的错误或警告信息
]);

export default function RootLayout() {
  return (
    <AuthProvider>
      <ColorSchemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark"></StatusBar>
          <Stack screenOptions={{
            // 设置所有页面的切换动画为从右侧滑入，适用于iOS 和 Android
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            // 隐藏自带的头部
            headerShown: false
          }}>
            <Stack.Screen name="index" options={{ title: "首页" }} />
            <Stack.Screen name="lesson-plan" options={{ title: "教案生成" }} />
            <Stack.Screen name="ppt-generation" options={{ title: "PPT生成" }} />
            <Stack.Screen name="ppt-preview" options={{ title: "PPT预览" }} />
            <Stack.Screen name="generate" options={{ title: "生成教案" }} />
            <Stack.Screen name="preview" options={{ title: "预览教案" }} />
            <Stack.Screen name="adjustment" options={{ title: "AI调整" }} />
            <Stack.Screen name="history" options={{ title: "历史教案" }} />
            <Stack.Screen name="detail" options={{ title: "教案详情" }} />
          </Stack>
          <Toast />
        </GestureHandlerRootView>
      </ColorSchemeProvider>
    </AuthProvider>
  );
}
