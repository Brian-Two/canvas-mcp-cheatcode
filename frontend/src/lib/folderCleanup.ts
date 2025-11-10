/**
 * Utility to clean up duplicate folders
 * Run this in browser console if you have duplicate folders:
 * 
 * import { cleanupDuplicateFolders } from '@/lib/folderCleanup';
 * cleanupDuplicateFolders();
 */

import { getFolders, saveFolders } from './folderManager';

export const cleanupDuplicateFolders = (): void => {
  const folders = getFolders();
  const seen = new Map<string, string>(); // courseId -> first folder id
  const toKeep: typeof folders = [];
  const toRemove: string[] = [];

  console.log('Starting folder cleanup...');
  console.log('Total folders:', folders.length);

  folders.forEach(folder => {
    if (folder.courseId) {
      // This folder is linked to a Canvas course
      if (seen.has(folder.courseId)) {
        // Duplicate! Keep the first one we saw
        toRemove.push(folder.id);
        console.log(`Removing duplicate folder: ${folder.name} (ID: ${folder.id}, CourseID: ${folder.courseId})`);
      } else {
        seen.set(folder.courseId, folder.id);
        toKeep.push(folder);
      }
    } else {
      // Not linked to Canvas, keep it
      toKeep.push(folder);
    }
  });

  if (toRemove.length > 0) {
    console.log(`Removed ${toRemove.length} duplicate folders`);
    console.log('Keeping:', toKeep.map(f => ({ id: f.id, name: f.name, courseId: f.courseId })));
    saveFolders(toKeep);
    window.location.reload();
  } else {
    console.log('No duplicate folders found!');
  }
};

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).cleanupDuplicateFolders = cleanupDuplicateFolders;
}


