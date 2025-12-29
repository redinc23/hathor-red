import { initializeSyncEngine } from './engine';

(async () => {
  await initializeSyncEngine();
  console.log('Sync worker started and awaiting jobs...');
})();
