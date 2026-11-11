// Saves no IndexedDB via Dexie: 3 slots fixos.
import Dexie, { type EntityTable } from 'dexie';
import type { SaveRecord, Slot } from './saveFormat';

class SaveDb extends Dexie {
  saves!: EntityTable<SaveRecord, 'slot'>;
  constructor() {
    super('manager-cs');
    this.version(1).stores({ saves: 'slot, updatedAt' });
  }
}

export const db = new SaveDb();

export const listSaves = () => db.saves.orderBy('slot').toArray();
export const getSave = (slot: Slot) => db.saves.get(slot);
export const putSave = (record: SaveRecord) => db.saves.put(record);
export const deleteSave = (slot: Slot) => db.saves.delete(slot);

/** Save mais recente (para o "Continuar"). */
export const lastSave = () => db.saves.orderBy('updatedAt').last();
