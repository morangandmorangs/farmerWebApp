declare module "redux-persist-indexeddb-storage" {
  import { Storage } from "redux-persist";

  /**
   * Creates an IndexedDB storage engine for redux-persist
   *
   * @param dbName The name of the IndexedDB database
   * @param storeName Optional name of the store to use (defaults to 'keyval')
   * @param version Optional version of the database
   * @returns A Storage object for redux-persist
   */
  export default function createIdbStorage(
    dbName: string,
    storeName?: string,
    version?: number,
  ): Storage;
}
