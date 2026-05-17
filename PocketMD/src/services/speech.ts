import { NativeModules, PermissionsAndroid } from 'react-native';

const { SpeechModule } = NativeModules;

export async function requestMicPermission(): Promise<boolean> {
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone Permission',
      message: 'Pocket MA needs microphone access to transcribe your symptoms.',
      buttonPositive: 'Allow',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function listen(locale = 'en-US'): Promise<string> {
  return SpeechModule.startListening(locale);
}

export function stopListening(): void {
  SpeechModule.stopListening();
}
