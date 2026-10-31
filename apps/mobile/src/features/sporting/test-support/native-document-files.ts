/** Synthetic F03 cache boundary shared by transport and reader lifecycle tests. */
export class DocumentFile {
  uri: string;
  name: string;
  exists = false;
  create = jest.fn();
  write = jest.fn((bytes: Uint8Array) => {
    this.exists = true;
    documentWrite(bytes);
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

/** Native byte-write outcome; tests may fail a write after a partial file has appeared. */
export const documentWrite = jest.fn();
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
