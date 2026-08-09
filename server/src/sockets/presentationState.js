import PresentationState from '../models/PresentationState.js';

let cachedStateId = null;

async function getDoc() {
  let doc = cachedStateId ? await PresentationState.findById(cachedStateId) : null;
  if (!doc) {
    doc = await PresentationState.findOneAndUpdate(
      { singletonKey: 'main' },
      { $setOnInsert: { singletonKey: 'main' } },
      { new: true, upsert: true }
    );
    cachedStateId = doc._id;
  }
  return doc;
}

export async function getState() {
  const doc = await getDoc();
  return await populateState(doc);
}

async function populateState(doc) {
  await doc.populate([
    { path: 'event' },
    { path: 'activeSubEvent' },
    { path: 'activePoster' },
  ]);
  return doc.toObject({ virtuals: false });
}

export async function updateState(patch) {
  const doc = await getDoc();
  doc.set(patch);
  await doc.save();
  return await populateState(doc);
}

export async function updateCountdown(patch) {
  const doc = await getDoc();
  doc.set(
    Object.fromEntries(Object.entries(patch).map(([key, value]) => [`countdown.${key}`, value]))
  );
  await doc.save();
  return await populateState(doc);
}

export async function updatePosterUnveilCountdown(patch) {
  const doc = await getDoc();
  doc.set(
    Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [`posterUnveilCountdown.${key}`, value])
    )
  );
  await doc.save();
  return await populateState(doc);
}
