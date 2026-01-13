import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'crowd_user_id';

export const getOrGenerateUserId = (): string => {
  const existingId = localStorage.getItem(STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const newId = uuidv4();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
};

export const refreshUserId = (): string => {
  const newId = uuidv4();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
};
