import RNFS from 'react-native-fs';
import { initLlama, type LlamaContext } from 'llama.rn';

const MODEL_URL =
  'https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf';
const MODEL_FILENAME = 'gemma-4-E2B-it-Q4_K_M.gguf';
const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/${MODEL_FILENAME}`;

let context: LlamaContext | null = null;

export async function initModel(
  onProgress: (progress: number) => void,
): Promise<void> {
  const exists = await RNFS.exists(MODEL_PATH);
  if (!exists) {
    const { promise } = RNFS.downloadFile({
      fromUrl: MODEL_URL,
      toFile: MODEL_PATH,
      progress: res => {
        onProgress(res.bytesWritten / res.contentLength);
      },
    });
    await promise;
  }

  onProgress(1);

  context = await initLlama({
    model: MODEL_PATH,
    n_ctx: 2048,
    n_gpu_layers: 99,
  });
}

export function getContext(): LlamaContext {
  if (!context) {
    throw new Error('Model not initialized');
  }
  return context;
}
