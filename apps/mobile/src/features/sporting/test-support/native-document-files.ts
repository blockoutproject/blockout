/** Synthetic F03 cache boundary shared by transport and reader lifecycle tests. */
export class DocumentFile {
  uri: string;
  name: string;
  exists = false;
  create = jest.fn();
  write = jest.fn(async (bytes: Uint8Array) => {
    this.exists = true;
    await documentWrite(bytes);
  });
  delete = jest.fn(() => {
    this.exists = false;
  });

  /** Records only synthetic local handles; the caller chooses every filename. */
  constructor(parent: { uri: string }, name: string) {
    this.name = name;
    this.uri = `${parent.uri}/${name}`;
    documentFiles.push(this);
  }
}

/** Native asynchronous byte-write outcome; a rejected promise may leave a partial file. */
export const documentWrite = jest.fn<Promise<void>, [Uint8Array]>();
/** Current synthetic handles, reset independently for every test. */
export const documentFiles: DocumentFile[] = [];

/** F03's private directory; unrelated filenames remain visible to verify selective cleanup. */
class DocumentDirectory {
  uri = "file:///cache/f03-match-documents";
  exists = true;
  create = jest.fn();
  /** Lists the synthetic native handles without implementing any application cleanup behavior. */
  list() {
    return documentFiles;
  }
}

/** Expo file I/O only; production download, ownership and cleanup functions remain real. */
export const nativeDocumentFiles = {
  File: DocumentFile,
  Directory: DocumentDirectory,
  Paths: { cache: { uri: "file:///cache" } },
};

/** Controlled native FileReader boundary; Node Blob supplies bytes only for ordinary fixture defaults. */
export class DocumentReader {
  static LOADING = 1;
  readyState = 0;
  result: ArrayBuffer | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  abort = jest.fn(() => {
    this.readyState = 2;
  });

  /** Starts one native read; tests can retain it and choose completion or cancellation. */
  readAsArrayBuffer(blob: Blob) {
    this.readyState = DocumentReader.LOADING;
    documentReaders.push(this);
    documentRead(this, blob);
  }
}

/** Native read handles, reset for every scenario. */
export const documentReaders: DocumentReader[] = [];
/** Supplies ordinary native completion; explicit boundary cases override this native I/O only. */
export const documentRead = jest.fn((reader: DocumentReader, blob: Blob) => {
  void blob.arrayBuffer().then((bytes) => {
    if (reader.readyState !== DocumentReader.LOADING) return;
    reader.result = bytes;
    reader.readyState = 2;
    reader.onload?.();
  });
});
