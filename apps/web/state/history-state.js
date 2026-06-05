export function snapshotProject(project) {
  return JSON.stringify(project);
}

export function restoreProjectFromSnapshot(snapshot) {
  return JSON.parse(snapshot);
}

export function pushHistorySnapshot(history, snapshot) {
  const undo = history.undo;
  if (undo[undo.length - 1] === snapshot) return false;
  undo.push(snapshot);
  if (undo.length > 60) undo.shift();
  history.redo = [];
  return true;
}

export function resetHistory(history) {
  history.undo = [];
  history.redo = [];
}
