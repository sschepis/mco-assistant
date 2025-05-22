/* eslint-disable @typescript-eslint/no-explicit-any */
// src/shared/managers/StateManager.js

import jsonpatch from 'fast-json-patch';
import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'events';

class StateManager extends EventEmitter {

  states;
    stateHistory;
    stateVersions;
    conflictStrategies;
    stateSchemas;
  constructor() {
    super();
    this.states = new Map();
    this.stateHistory = new Map();
    this.stateVersions = new Map();
    this.conflictStrategies = new Map();
    this.stateSchemas = new Map();
  }

  initState(objectId: any, initialState: any, schema = null) {
    this.states.set(objectId, initialState);
    this.stateHistory.set(objectId, [{ state: initialState, version: 0 }]);
    this.stateVersions.set(objectId, 0);
    if (schema) {
      this.stateSchemas.set(objectId, schema);
    }
  }

  getState(objectId: any) {
    return this.states.get(objectId);
  }

  setState(objectId: any, newState: any) {
    const oldState = this.states.get(objectId);
    const patch = this.generatePatch(oldState, newState);
    return this.applyPatch(objectId, patch);
  }

  updateState(state: any) {
    const objectId = state.id;
    const oldState = this.states.get(objectId);
    const patch = this.generatePatch(oldState, state);
    return this.applyPatch(objectId, patch);
  }
  
  applyPatch(objectId: any, patch: any) {
    const oldState = this.states.get(objectId);
    const newState = jsonpatch.applyPatch(oldState, patch).newDocument;
    
    if (this.validateState(objectId)) {
      const newVersion = this.getStateVersion(objectId) + 1;
      this.states.set(objectId, newState);
      this.stateHistory.get(objectId).push({ state: newState, version: newVersion });
      this.setStateVersion(objectId, newVersion);
      this.emit('stateChanged', { objectId, newState, oldState, patch });
      return newState;
    } else {
      throw new Error('Invalid state transition');
    }
  }

  generatePatch(oldState: any, newState: any) {
    return jsonpatch.compare(oldState, newState);
  }

  resolveConflict(localState: any, remoteState: any, objectId: any) {
    const strategy = this.conflictStrategies.get(objectId) || this.defaultConflictStrategy;
    return strategy(localState, remoteState);
  }

  defaultConflictStrategy(localState: any, remoteState: any) {
    return { ...remoteState, ...localState };
  }

  registerConflictStrategy(objectId: any, strategyFunc: any) {
    this.conflictStrategies.set(objectId, strategyFunc);
  }

  getStateVersion(objectId: any) {
    return this.stateVersions.get(objectId) || 0;
  }

  setStateVersion(objectId: any, version: any) {
    this.stateVersions.set(objectId, version);
  }

  validateState(objectId: string): boolean {
    const schema = this.stateSchemas.get(objectId);
    if (schema) {
      // Implement schema validation logic here
      // For example, using a library like Ajv
      return true; // Placeholder
    }
    return true;
  }

  rollback(objectId: any, toVersion: any) {
    const history = this.stateHistory.get(objectId);
    const targetState = history.find((item: any) => item.version === toVersion);
    if (targetState) {
      this.states.set(objectId, targetState.state);
      this.setStateVersion(objectId, toVersion);
      this.emit('stateRolledBack', { objectId, newState: targetState.state, version: toVersion });
      return targetState.state;
    }
    throw new Error(`Version ${toVersion} not found in history`);
  }

  forward(objectId: any, toVersion: any) {
    const history = this.stateHistory.get(objectId);
    const targetState = history.find((item: any) => item.version === toVersion);
    if (targetState) {
      this.states.set(objectId, targetState.state);
      this.setStateVersion(objectId, toVersion);
      this.emit('stateForwarded', { objectId, newState: targetState.state, version: toVersion });
      return targetState.state;
    }
    throw new Error(`Version ${toVersion} not found in history`);
  }

  createSnapshot(objectId: any) {
    const state = this.states.get(objectId);
    const version = this.getStateVersion(objectId);
    const snapshot = { id: uuidv4(), state, version, timestamp: Date.now() };
    this.emit('snapshotCreated', { objectId, snapshot });
    return snapshot;
  }

  batchUpdate(objectId: any, updates: any) {
    const oldState = this.states.get(objectId);
    let newState = { ...oldState };
    for (const update of updates) {
      newState = { ...newState, ...update };
    }
    return this.setState(objectId, newState);
  }

  persistState(objectId: string): void {
    const state = this.states.get(objectId);
    const version = this.getStateVersion(objectId);
    localStorage.setItem(`state_${objectId}`, JSON.stringify({ state, version }));
  }

  loadPersistedState(objectId: any) {
    const persistedData = localStorage.getItem(`state_${objectId}`);
    if (persistedData) {
      const { state, version } = JSON.parse(persistedData);
      this.states.set(objectId, state);
      this.setStateVersion(objectId, version);
      this.emit('stateLoaded', { objectId, state, version });
      return state;
    }
    return null;
  }
}

export default StateManager;