declare module 'tesseract.js' {
  export interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
    };
  }

  export interface Worker {
    recognize(image: string | File, lang?: string, options?: object): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  }

  export interface CreateWorkerOptions {
    logger?: (m: { status: string; progress: number }) => void;
  }

  export function createWorker(
    lang?: string,
    ocd?: number,
    options?: CreateWorkerOptions
  ): Promise<Worker>;
}
