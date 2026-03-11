import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.COZE_PROJECT_NAME || process.env.EXPO_PUBLIC_COZE_PROJECT_NAME || '求真教案';
const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
const slugAppName = projectId ? `app${projectId}` : 'myapp';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": "求真教案",
    "slug": slugAppName,
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#1678D1"
      },
      "package": `com.anonymous.x${projectId || '0'}`
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      'expo-router',
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#1678D1"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": `允许求真教案生成App访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许求真教案生成App使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许求真教案生成App访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": `求真教案生成App需要访问您的位置以提供周边服务及导航功能。`
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": `求真教案生成App需要访问相机以拍摄照片和视频。`,
          "microphonePermission": `求真教案生成App需要访问麦克风以录制视频声音。`,
          "recordAudioAndroid": true
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": `允许求真教案生成App访问您的麦克风，以便使用语音输入功能。`
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": `允许求真教案生成App访问您的相册，以便您保存教育金句卡片和其他重要内容。`,
          "savePhotosPermission": `允许求真教案生成App保存教育金句卡片和其他内容到您的相册。`
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}