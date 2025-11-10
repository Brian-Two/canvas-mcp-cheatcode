/**
 * Fix folders that have duplicate IDs
 * Run this in browser console:
 * 
 * fixDuplicateFolderIds()
 */

import { getFolders, saveFolders } from './folderManager';

export const fixDuplicateFolderIds = (): void => {
  const folders = getFolders();
  const seenIds = new Map<string, number>(); // id -> count
  const needsFixing: number[] = [];

  console.log('Checking for duplicate folder IDs...');
  console.log('Total folders:', folders.length);

  // Find duplicates
  folders.forEach((folder, index) => {
    const count = seenIds.get(folder.id) || 0;
    seenIds.set(folder.id, count + 1);
    
    if (count > 0) {
      needsFixing.push(index);
      console.log(`Duplicate ID found: ${folder.id} for folder "${folder.name}"`);
    }
  });

  if (needsFixing.length === 0) {
    console.log('✅ No duplicate IDs found!');
    return;
  }

  console.log(`Found ${needsFixing.length} folders with duplicate IDs. Fixing...`);

  // Fix duplicates by assigning new IDs
  needsFixing.forEach(index => {
    const oldId = folders[index].id;
    const newId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    folders[index].id = newId;
    console.log(`Fixed: ${oldId} -> ${newId} for folder "${folders[index].name}"`);
  });

  // Save fixed folders
  saveFolders(folders);
  console.log('✅ Fixed all duplicate IDs. Reloading page...');
  
  setTimeout(() => {
    window.location.reload();
  }, 1000);
};

// Also check for same courseId folders
export const checkDuplicateCourseIds = (): void => {
  const folders = getFolders();
  const byCourseId = new Map<string, typeof folders>();

  folders.forEach(folder => {
    if (folder.courseId) {
      const existing = byCourseId.get(folder.courseId) || [];
      existing.push(folder);
      byCourseId.set(folder.courseId, existing);
    }
  });

  console.log('Folders by Course ID:');
  byCourseId.forEach((folderList, courseId) => {
    if (folderList.length > 1) {
      console.warn(`⚠️ Course ID ${courseId} has ${folderList.length} folders:`);
      folderList.forEach(f => console.log(`  - ${f.name} (ID: ${f.id})`));
    } else {
      console.log(`✅ Course ID ${courseId}: ${folderList[0].name}`);
    }
  });
};

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).fixDuplicateFolderIds = fixDuplicateFolderIds;
  (window as any).checkDuplicateCourseIds = checkDuplicateCourseIds;
}


