import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Navigate, Outlet } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { configureStore, createSlice, createAsyncThunk, PayloadAction, combineReducers } from '@reduxjs/toolkit';
import './App.css';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const defaultRows = 100;
const defaultCols = 26;

interface CellData {
  raw: string;
  res: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  bgColor?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'number' | 'percent' | 'currency' | 'date';
}

interface Document {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  rows: number;
  cols: number;
  data: Record<string, CellData>;
  userId: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface DocumentsState {
  list: Document[];
  currentId: number | null;
  currentName: string;
  loading: boolean;
  error: string | null;
}

interface SpreadsheetState {
  data: Record<string, CellData>;
  rows: number;
  cols: number;
  selectedCell: string;
  selectedRange: string | null;
  history: Record<string, CellData>[][];
  historyIndex: number;
  saveStatus: 'saved' | 'saving' | 'error';
  clipboard: { data: Record<string, CellData>; action: 'copy' | 'cut' } | null;
}

interface UIState {
  modalOpen: boolean;
  newDocName: string;
  newDocRows: number;
  newDocCols: number;
  contextMenu: { show: boolean; x: number; y: number; row: number | null };
  showFormatPanel: boolean;
  confirmDialog: { show: boolean; message: string; onConfirm: () => void; onCancel: () => void } | null;
}

const loadUsers = (): User[] => {
  const stored = localStorage.getItem('spreadsheet_users');
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

const saveUsers = (users: User[]) => {
  localStorage.setItem('spreadsheet_users', JSON.stringify(users));
};

const loadDocuments = (): Document[] => {
  const stored = localStorage.getItem('spreadsheet_documents');
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

const saveDocuments = (docs: Document[]) => {
  localStorage.setItem('spreadsheet_documents', JSON.stringify(docs));
};

const createEmptyCell = (): CellData => ({
  raw: '',
  res: '',
  bold: false,
  italic: false,
  underline: false,
  bgColor: '#ffffff',
  textColor: '#000000',
  align: 'left',
  format: 'number',
});

const createEmptyDocumentData = (rows: number, cols: number): Record<string, CellData> => {
  const empty: Record<string, CellData> = {};
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < Math.min(cols, alphabet.length); j++) {
      const id = alphabet[j] + (i + 1);
      empty[id] = createEmptyCell();
    }
  }
  return empty;
};

const getRangeValues = (data: Record<string, CellData>, range: string): number[] => {
  const parts = range.split(':');
  const start = parts[0];
  const end = parts[1];
  const startCol = start.match(/[A-Z]+/)?.[0] || '';
  const startRow = parseInt(start.match(/\d+/)?.[0] || '0');
  const endCol = end.match(/[A-Z]+/)?.[0] || '';
  const endRow = parseInt(end.match(/\d+/)?.[0] || '0');
  const result: number[] = [];
  const startIdx = alphabet.indexOf(startCol);
  const endIdx = alphabet.indexOf(endCol);
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startIdx; c <= endIdx; c++) {
      const id = alphabet[c] + r;
      const num = parseFloat(data[id]?.res) || 0;
      result.push(num);
    }
  }
  return result;
};

const sumRange = (data: Record<string, CellData>, range: string): number => {
  const vals = getRangeValues(data, range);
  return vals.reduce((a, b) => a + b, 0);
};

const averageRange = (data: Record<string, CellData>, range: string): number => {
  const vals = getRangeValues(data, range);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const calculateFormula = (data: Record<string, CellData>, formula: string): string => {
  if (!formula || formula[0] !== '=') return formula;
  let expr = formula.slice(1).toUpperCase();

  let sumMatch = expr.match(/SUM\([A-Z]+\d+:[A-Z]+\d+\)/);
  while (sumMatch) {
    const rng = sumMatch[0].slice(4, -1);
    const val = sumRange(data, rng);
    expr = expr.replace(sumMatch[0], val.toString());
    sumMatch = expr.match(/SUM\([A-Z]+\d+:[A-Z]+\d+\)/);
  }

  let avgMatch = expr.match(/AVERAGE\([A-Z]+\d+:[A-Z]+\d+\)/);
  while (avgMatch) {
    const rng = avgMatch[0].slice(8, -1);
    const val = averageRange(data, rng);
    expr = expr.replace(avgMatch[0], val.toString());
    avgMatch = expr.match(/AVERAGE\([A-Z]+\d+:[A-Z]+\d+\)/);
  }

  const refs = expr.match(/[A-Z]+\d+/g);
  if (refs) {
    for (const ref of refs) {
      const val = data[ref]?.res || '0';
      const re = new RegExp(ref, 'g');
      expr = expr.replace(re, val);
    }
  }

  try {
    const result = eval(expr);
    return String(result);
  } catch (e) {
    return '#ОШИБКА';
  }
};

const recalculateAll = (data: Record<string, CellData>): Record<string, CellData> => {
  const newData = { ...data };
  for (const id in newData) {
    if (newData[id].raw && newData[id].raw[0] === '=') {
      const newRes = calculateFormula(newData, newData[id].raw);
      if (newRes !== newData[id].res) {
        newData[id] = { ...newData[id], res: newRes };
      }
    }
  }
  return newData;
};

const formatCellValue = (value: string, format?: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  switch (format) {
    case 'percent': return (num * 100).toFixed(2) + '%';
    case 'currency': return '₽' + num.toFixed(2);
    case 'date': return new Date(num).toLocaleDateString('ru-RU');
    default: return value;
  }
};

const generateToken = (userId: number): string => {
  return 'token_' + userId + '_' + Date.now() + '_' + Math.random();
};

const verifyToken = (token: string): { valid: boolean; userId?: number } => {
  const parts = token.split('_');
  if (parts[0] === 'token' && parts[1]) {
    return { valid: true, userId: parseInt(parts[1]) };
  }
  return { valid: false };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null as Omit<User, 'password'> | null,
    token: null as string | null,
    isAuthenticated: false,
    loading: false,
    error: null as string | null,
  } as AuthState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    loginSuccess: (state, action: PayloadAction<{ user: Omit<User, 'password'>; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { dispatch, rejectWithValue }) => {
    dispatch(authSlice.actions.setLoading(true));
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = loadUsers();
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error('Неверный email или пароль');
      }
      const token = generateToken(user.id);
      const { password: _, ...userWithoutPassword } = user;
      dispatch(authSlice.actions.loginSuccess({ user: userWithoutPassword, token }));
      return { user: userWithoutPassword, token };
    } catch (error: any) {
      dispatch(authSlice.actions.setError(error.message));
      return rejectWithValue(error.message);
    } finally {
      dispatch(authSlice.actions.setLoading(false));
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }: { name: string; email: string; password: string }, { dispatch, rejectWithValue }) => {
    dispatch(authSlice.actions.setLoading(true));
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = loadUsers();
      const existing = users.find(u => u.email === email);
      if (existing) {
        throw new Error('Пользователь с таким email уже существует');
      }
      const newUser: User = {
        id: Date.now(),
        name,
        email,
        password,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      saveUsers(users);
      const token = generateToken(newUser.id);
      const { password: _, ...userWithoutPassword } = newUser;

      // Создаём пустую таблицу для нового пользователя
      const emptyData = createEmptyDocumentData(defaultRows, defaultCols);
      const firstDoc: Document = {
        id: Date.now() + 1,
        name: 'Моя первая таблица',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rows: defaultRows,
        cols: defaultCols,
        data: emptyData,
        userId: newUser.id,
      };
      const docs = loadDocuments();
      docs.push(firstDoc);
      saveDocuments(docs);

      dispatch(authSlice.actions.loginSuccess({ user: userWithoutPassword, token }));
      return { user: userWithoutPassword, token };
    } catch (error: any) {
      dispatch(authSlice.actions.setError(error.message));
      return rejectWithValue(error.message);
    } finally {
      dispatch(authSlice.actions.setLoading(false));
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ userId, oldPassword, newPassword }: { userId: number; oldPassword: string; newPassword: string }, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('Пользователь не найден');
    }
    if (users[userIndex].password !== oldPassword) {
      throw new Error('Неверный старый пароль');
    }
    users[userIndex].password = newPassword;
    saveUsers(users);
    return;
  }
);

export const updateUserName = createAsyncThunk(
  'auth/updateName',
  async ({ userId, newName }: { userId: number; newName: string }, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('Пользователь не найден');
    }
    users[userIndex].name = newName;
    saveUsers(users);
    return newName;
  }
);

export const loadUserDocuments = createAsyncThunk(
  'documents/load',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const userId = state.auth.user?.id;
    if (!userId) {
      return rejectWithValue('Не авторизован');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    const allDocs = loadDocuments();
    let userDocs = allDocs.filter(doc => doc.userId === userId);
    if (userDocs.length === 0) {
      const emptyData = createEmptyDocumentData(defaultRows, defaultCols);
      const newDoc: Document = {
        id: Date.now(),
        name: 'Моя таблица',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rows: defaultRows,
        cols: defaultCols,
        data: emptyData,
        userId: userId,
      };
      userDocs = [newDoc];
      allDocs.push(newDoc);
      saveDocuments(allDocs);
    }
    return userDocs;
  }
);

export const loadDocumentById = createAsyncThunk(
  'documents/loadById',
  async ({ id, token }: { id: number; token: string }, { getState, rejectWithValue }) => {
    const verification = verifyToken(token);
    if (!verification.valid || !verification.userId) {
      return rejectWithValue('Неверный токен');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    const allDocs = loadDocuments();
    const doc = allDocs.find(d => d.id === id);
    if (!doc) {
      return rejectWithValue('Документ не найден');
    }
    if (doc.userId !== verification.userId) {
      return rejectWithValue('403');
    }
    return doc;
  }
);

export const saveDocumentToStorage = createAsyncThunk(
  'documents/save',
  async ({ id, data, rows, cols, name, token }: { id: number; data: Record<string, CellData>; rows: number; cols: number; name: string; token: string }, { getState, rejectWithValue }) => {
    const verification = verifyToken(token);
    if (!verification.valid || !verification.userId) {
      return rejectWithValue('Неверный токен');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    const allDocs = loadDocuments();
    const docIndex = allDocs.findIndex(d => d.id === id);
    if (docIndex === -1) {
      return rejectWithValue('Документ не найден');
    }
    if (allDocs[docIndex].userId !== verification.userId) {
      return rejectWithValue('403');
    }
    const updatedDoc: Document = {
      ...allDocs[docIndex],
      data,
      rows,
      cols,
      name,
      updatedAt: new Date().toISOString(),
    };
    allDocs[docIndex] = updatedDoc;
    saveDocuments(allDocs);
    return updatedDoc;
  }
);

export const createDocumentInStorage = createAsyncThunk(
  'documents/create',
  async ({ name, rows, cols, token }: { name: string; rows: number; cols: number; token: string }, { rejectWithValue }) => {
    const verification = verifyToken(token);
    if (!verification.valid || !verification.userId) {
      return rejectWithValue('Неверный токен');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    const emptyData = createEmptyDocumentData(rows, cols);
    const newDoc: Document = {
      id: Date.now(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rows,
      cols: Math.min(cols, alphabet.length),
      data: emptyData,
      userId: verification.userId,
    };
    const allDocs = loadDocuments();
    allDocs.push(newDoc);
    saveDocuments(allDocs);
    const userDocs = allDocs.filter(doc => doc.userId === verification.userId);
    return { newDoc, userDocs };
  }
);

export const deleteDocumentFromStorage = createAsyncThunk(
  'documents/delete',
  async ({ id, token }: { id: number; token: string }, { rejectWithValue }) => {
    const verification = verifyToken(token);
    if (!verification.valid || !verification.userId) {
      return rejectWithValue('Неверный токен');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    const allDocs = loadDocuments();
    const docIndex = allDocs.findIndex(d => d.id === id);
    if (docIndex === -1) {
      return rejectWithValue('Документ не найден');
    }
    if (allDocs[docIndex].userId !== verification.userId) {
      return rejectWithValue('403');
    }
    allDocs.splice(docIndex, 1);
    saveDocuments(allDocs);
    const userDocs = allDocs.filter(doc => doc.userId === verification.userId);
    return userDocs;
  }
);

export const renameDocumentInStorage = createAsyncThunk(
  'documents/rename',
  async ({ id, newName, token }: { id: number; newName: string; token: string }, { rejectWithValue }) => {
    const verification = verifyToken(token);
    if (!verification.valid || !verification.userId) {
      return rejectWithValue('Неверный токен');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    const allDocs = loadDocuments();
    const docIndex = allDocs.findIndex(d => d.id === id);
    if (docIndex === -1) {
      return rejectWithValue('Документ не найден');
    }
    if (allDocs[docIndex].userId !== verification.userId) {
      return rejectWithValue('403');
    }
    allDocs[docIndex].name = newName;
    allDocs[docIndex].updatedAt = new Date().toISOString();
    saveDocuments(allDocs);
    const userDocs = allDocs.filter(doc => doc.userId === verification.userId);
    return { userDocs, id, newName };
  }
);

export const duplicateDocumentInStorage = createAsyncThunk(
  'documents/duplicate',
  async ({ id, token }: { id: number; token: string }, { getState, rejectWithValue }) => {
    const verification = verifyToken(token);
    if (!verification.valid || !verification.userId) {
      return rejectWithValue('Неверный токен');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    const allDocs = loadDocuments();
    const original = allDocs.find(d => d.id === id);
    if (!original || original.userId !== verification.userId) {
      return rejectWithValue('Документ не найден или нет доступа');
    }
    const copy: Document = {
      ...original,
      id: Date.now(),
      name: original.name + ' - копия',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allDocs.push(copy);
    saveDocuments(allDocs);
    const userDocs = allDocs.filter(doc => doc.userId === verification.userId);
    return userDocs;
  }
);

const spreadsheetSlice = createSlice({
  name: 'spreadsheet',
  initialState: {
    data: createEmptyDocumentData(defaultRows, defaultCols),
    rows: defaultRows,
    cols: defaultCols,
    selectedCell: 'A1',
    selectedRange: null as string | null,
    history: [] as Record<string, CellData>[][],
    historyIndex: -1,
    saveStatus: 'saved' as 'saved' | 'saving' | 'error',
    clipboard: null as { data: Record<string, CellData>; action: 'copy' | 'cut' } | null,
  } as SpreadsheetState,
  reducers: {
    loadData: (state, action: PayloadAction<{ data: Record<string, CellData>; rows: number; cols: number }>) => {
      state.data = action.payload.data;
      state.rows = action.payload.rows;
      state.cols = action.payload.cols;
      state.history = [];
      state.historyIndex = -1;
      state.saveStatus = 'saved';
    },
    updateCell: (state, action: PayloadAction<{ id: string; value: string }>) => {
      const { id, value } = action.payload;
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.data)));
      state.history = newHistory;
      state.historyIndex = newHistory.length - 1;

      if (value[0] === '=') {
        const res = calculateFormula(state.data, value);
        state.data[id] = { ...state.data[id], raw: value, res };
      } else {
        state.data[id] = { ...state.data[id], raw: value, res: value };
      }
      state.saveStatus = 'saving';
    },
    updateCellStyle: (state, action: PayloadAction<{ id: string; styles: Partial<CellData> }>) => {
      const { id, styles } = action.payload;
      state.data[id] = { ...state.data[id], ...styles };
      state.saveStatus = 'saving';
    },
    updateRangeStyle: (state, action: PayloadAction<{ range: string; styles: Partial<CellData> }>) => {
      const { range, styles } = action.payload;
      const [start, end] = range.split(':');
      const startCol = start.match(/[A-Z]+/)?.[0] || '';
      const startRow = parseInt(start.match(/\d+/)?.[0] || '0');
      const endCol = end.match(/[A-Z]+/)?.[0] || '';
      const endRow = parseInt(end.match(/\d+/)?.[0] || '0');
      const startIdx = alphabet.indexOf(startCol);
      const endIdx = alphabet.indexOf(endCol);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startIdx; c <= endIdx; c++) {
          const id = alphabet[c] + r;
          state.data[id] = { ...state.data[id], ...styles };
        }
      }
      state.saveStatus = 'saving';
    },
    setSelectedCell: (state, action: PayloadAction<string>) => {
      state.selectedCell = action.payload;
    },
    setSelectedRange: (state, action: PayloadAction<string | null>) => {
      state.selectedRange = action.payload;
    },
    copyToClipboard: (state, action: PayloadAction<{ range: string; action: 'copy' | 'cut' }>) => {
      const { range, action: copyAction } = action.payload;
      const [start, end] = range.split(':');
      const startCol = start.match(/[A-Z]+/)?.[0] || '';
      const startRow = parseInt(start.match(/\d+/)?.[0] || '0');
      const endCol = end.match(/[A-Z]+/)?.[0] || '';
      const endRow = parseInt(end.match(/\d+/)?.[0] || '0');
      const startIdx = alphabet.indexOf(startCol);
      const endIdx = alphabet.indexOf(endCol);

      const copyData: Record<string, CellData> = {};
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startIdx; c <= endIdx; c++) {
          const id = alphabet[c] + r;
          copyData[id] = { ...state.data[id] };
        }
      }
      state.clipboard = { data: copyData, action: copyAction };

      if (copyAction === 'cut') {
        for (const id in copyData) {
          state.data[id] = { ...state.data[id], raw: '', res: '' };
        }
      }
      state.saveStatus = 'saving';
    },
    pasteFromClipboard: (state, action: PayloadAction<{ targetCell: string }>) => {
      if (!state.clipboard) return;

      const { targetCell } = action.payload;
      const targetCol = targetCell.match(/[A-Z]+/)?.[0] || '';
      const targetRow = parseInt(targetCell.match(/\d+/)?.[0] || '0');
      const targetColIdx = alphabet.indexOf(targetCol);

      const copyData = state.clipboard.data;
      const copyIds = Object.keys(copyData);
      if (copyIds.length === 0) return;

      const firstCopyId = copyIds[0];
      const firstCopyCol = firstCopyId.match(/[A-Z]+/)?.[0] || '';
      const firstCopyRow = parseInt(firstCopyId.match(/\d+/)?.[0] || '0');
      const offsetRow = targetRow - firstCopyRow;
      const offsetCol = targetColIdx - alphabet.indexOf(firstCopyCol);

      for (const id of copyIds) {
        const col = id.match(/[A-Z]+/)?.[0] || '';
        const row = parseInt(id.match(/\d+/)?.[0] || '0');
        const newColIdx = alphabet.indexOf(col) + offsetCol;
        const newRow = row + offsetRow;
        if (newColIdx >= 0 && newColIdx < alphabet.length && newRow > 0 && newRow <= state.rows) {
          const newId = alphabet[newColIdx] + newRow;
          if (state.data[newId]) {
            state.data[newId] = { ...state.data[newId], ...copyData[id] };
          }
          if (state.clipboard?.action === 'cut') {
            state.data[id] = { ...state.data[id], raw: '', res: '' };
          }
        }
      }
      state.clipboard = null;
      state.saveStatus = 'saving';
    },
    clearCell: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.data[id] = { ...state.data[id], raw: '', res: '' };
      state.saveStatus = 'saving';
    },
    undo: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.data = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.saveStatus = 'saving';
      }
    },
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.data = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.saveStatus = 'saving';
      }
    },
    setSaveStatus: (state, action: PayloadAction<'saved' | 'saving' | 'error'>) => {
      state.saveStatus = action.payload;
    },
    recalculateAll: (state) => {
      state.data = recalculateAll(state.data);
    },
    addRow: (state, action: PayloadAction<number>) => {
      const after = action.payload;
      const insertAt = after + 1;
      const newData: Record<string, CellData> = {};
      for (const key in state.data) {
        const col = key.match(/[A-Z]+/)?.[0] || '';
        const row = parseInt(key.match(/\d+/)?.[0] || '0');
        if (row <= insertAt) {
          newData[key] = state.data[key];
        } else if (row > insertAt && row <= state.rows) {
          newData[col + (row + 1)] = state.data[key];
        }
      }
      for (let j = 0; j < state.cols; j++) {
        const newId = alphabet[j] + (insertAt + 1);
        if (!newData[newId]) {
          newData[newId] = createEmptyCell();
        }
      }
      state.data = newData;
      state.rows++;
      state.saveStatus = 'saving';
    },
    deleteRow: (state, action: PayloadAction<number>) => {
      const idx = action.payload;
      const targetRow = idx + 1;
      const newData: Record<string, CellData> = {};
      for (const key in state.data) {
        const col = key.match(/[A-Z]+/)?.[0] || '';
        const row = parseInt(key.match(/\d+/)?.[0] || '0');
        if (row === targetRow) continue;
        if (row > targetRow) {
          newData[col + (row - 1)] = state.data[key];
        } else {
          newData[key] = state.data[key];
        }
      }
      state.data = newData;
      state.rows--;
      state.saveStatus = 'saving';
    },
  },
});

const documentsSlice = createSlice({
  name: 'documents',
  initialState: {
    list: [] as Document[],
    currentId: null as number | null,
    currentName: '',
    loading: false,
    error: null as string | null,
  } as DocumentsState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentDocument: (state, action: PayloadAction<{ id: number; name: string }>) => {
      state.currentId = action.payload.id;
      state.currentName = action.payload.name;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUserDocuments.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
        if (action.payload.length > 0 && !state.currentId) {
          state.currentId = action.payload[0].id;
          state.currentName = action.payload[0].name;
        }
      })
      .addCase(loadUserDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadDocumentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDocumentById.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.currentId = action.payload.id;
          state.currentName = action.payload.name;
        }
      })
      .addCase(loadDocumentById.rejected, (state, action) => {
        state.loading = false;
        if (action.payload === '403') {
          state.error = 'Нет доступа к этому документу';
        } else {
          state.error = action.payload as string;
        }
      })
      .addCase(createDocumentInStorage.fulfilled, (state, action) => {
        if (action.payload) {
          state.list = action.payload.userDocs;
          state.currentId = action.payload.newDoc.id;
          state.currentName = action.payload.newDoc.name;
        }
      })
      .addCase(deleteDocumentFromStorage.fulfilled, (state, action) => {
        if (action.payload) {
          state.list = action.payload;
          if (state.list.length > 0 && state.currentId) {
            const exists = state.list.some(d => d.id === state.currentId);
            if (!exists) {
              state.currentId = state.list[0].id;
              state.currentName = state.list[0].name;
            }
          } else if (state.list.length === 0) {
            state.currentId = null;
            state.currentName = '';
          }
        }
      })
      .addCase(renameDocumentInStorage.fulfilled, (state, action) => {
        if (action.payload) {
          state.list = action.payload.userDocs;
          if (state.currentId === action.payload.id) {
            state.currentName = action.payload.newName;
          }
        }
      })
      .addCase(duplicateDocumentInStorage.fulfilled, (state, action) => {
        if (action.payload) {
          state.list = action.payload;
        }
      })
      .addCase(saveDocumentToStorage.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.list.findIndex(d => d.id === action.payload.id);
          if (index !== -1) {
            state.list[index] = action.payload;
          }
          if (state.currentId === action.payload.id) {
            state.currentName = action.payload.name;
          }
        }
      });
  },
});

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    modalOpen: false,
    newDocName: '',
    newDocRows: 20,
    newDocCols: 10,
    contextMenu: { show: false, x: 0, y: 0, row: null as number | null },
    showFormatPanel: true,
    confirmDialog: null as { show: boolean; message: string; onConfirm: () => void; onCancel: () => void } | null,
  } as UIState,
  reducers: {
    setModalOpen: (state) => {
      state.modalOpen = true;
      state.newDocName = '';
      state.newDocRows = 20;
      state.newDocCols = 10;
    },
    setModalClose: (state) => {
      state.modalOpen = false;
    },
    setNewDocName: (state, action: PayloadAction<string>) => {
      state.newDocName = action.payload;
    },
    setNewDocRows: (state, action: PayloadAction<number>) => {
      state.newDocRows = action.payload;
    },
    setNewDocCols: (state, action: PayloadAction<number>) => {
      state.newDocCols = Math.min(action.payload, 26);
    },
    setContextMenu: (state, action: PayloadAction<{ show: boolean; x: number; y: number; row: number | null }>) => {
      state.contextMenu = action.payload;
    },
    setShowFormatPanel: (state, action: PayloadAction<boolean>) => {
      state.showFormatPanel = action.payload;
    },
    showConfirmDialog: (state, action: PayloadAction<{ message: string; onConfirm: () => void; onCancel: () => void }>) => {
      state.confirmDialog = { show: true, ...action.payload };
    },
    hideConfirmDialog: (state) => {
      state.confirmDialog = null;
    },
  },
});

const rootReducer = combineReducers({
  spreadsheet: spreadsheetSlice.reducer,
  documents: documentsSlice.reducer,
  ui: uiSlice.reducer,
  auth: authSlice.reducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector as <T>(selector: (state: RootState) => T) => T;

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const authError = useAppSelector((state: RootState) => state.auth.error);
  const loading = useAppSelector((state: RootState) => state.auth.loading);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email обязателен';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Неверный формат email';
    if (!password) newErrors.password = 'Пароль обязателен';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 8, width: 400, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: 20, textAlign: 'center' }}>Вход</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: 10, border: `1px solid ${errors.email ? 'red' : '#ccc'}`, borderRadius: 4 }}
            />
            {errors.email && <div style={{ color: 'red', fontSize: 12, marginTop: 5 }}>{errors.email}</div>}
          </div>
          <div style={{ marginBottom: 15 }}>
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: 10, border: `1px solid ${errors.password ? 'red' : '#ccc'}`, borderRadius: 4 }}
            />
            {errors.password && <div style={{ color: 'red', fontSize: 12, marginTop: 5 }}>{errors.password}</div>}
          </div>
          {authError && <div style={{ color: 'red', marginBottom: 15, textAlign: 'center' }}>{authError}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 12, background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {loading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>
        <p style={{ marginTop: 20, textAlign: 'center' }}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const authError = useAppSelector((state: RootState) => state.auth.error);
  const loading = useAppSelector((state: RootState) => state.auth.loading);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name) newErrors.name = 'Имя обязательно';
    if (!email) newErrors.email = 'Email обязателен';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Неверный формат email';
    if (!password) newErrors.password = 'Пароль обязателен';
    else if (password.length < 8) newErrors.password = 'Пароль должен быть не менее 8 символов';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Пароли не совпадают';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await dispatch(registerUser({ name, email, password }));
    if (registerUser.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 8, width: 400, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: 20, textAlign: 'center' }}>Регистрация</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <input
              type="text"
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: 10, border: `1px solid ${errors.name ? 'red' : '#ccc'}`, borderRadius: 4 }}
            />
            {errors.name && <div style={{ color: 'red', fontSize: 12, marginTop: 5 }}>{errors.name}</div>}
          </div>
          <div style={{ marginBottom: 15 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: 10, border: `1px solid ${errors.email ? 'red' : '#ccc'}`, borderRadius: 4 }}
            />
            {errors.email && <div style={{ color: 'red', fontSize: 12, marginTop: 5 }}>{errors.email}</div>}
          </div>
          <div style={{ marginBottom: 15 }}>
            <input
              type="password"
              placeholder="Пароль (мин. 8 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: 10, border: `1px solid ${errors.password ? 'red' : '#ccc'}`, borderRadius: 4 }}
            />
            {errors.password && <div style={{ color: 'red', fontSize: 12, marginTop: 5 }}>{errors.password}</div>}
          </div>
          <div style={{ marginBottom: 15 }}>
            <input
              type="password"
              placeholder="Подтверждение пароля"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: 10, border: `1px solid ${errors.confirmPassword ? 'red' : '#ccc'}`, borderRadius: 4 }}
            />
            {errors.confirmPassword && <div style={{ color: 'red', fontSize: 12, marginTop: 5 }}>{errors.confirmPassword}</div>}
          </div>
          {authError && <div style={{ color: 'red', marginBottom: 15, textAlign: 'center' }}>{authError}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 12, background: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p style={{ marginTop: 20, textAlign: 'center' }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

const FormatPanel = () => {
  const dispatch = useAppDispatch();
  const selectedCell = useAppSelector((state: RootState) => state.spreadsheet.selectedCell);
  const selectedRange = useAppSelector((state: RootState) => state.spreadsheet.selectedRange);
  const cellData = useAppSelector((state: RootState) => state.spreadsheet.data[selectedCell] || createEmptyCell());

  const applyStyle = (styles: Partial<CellData>) => {
    if (selectedRange) {
      dispatch(spreadsheetSlice.actions.updateRangeStyle({ range: selectedRange, styles }));
    } else {
      dispatch(spreadsheetSlice.actions.updateCellStyle({ id: selectedCell, styles }));
    }
  };

  return (
    <div style={{ padding: '8px 12px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <button onClick={() => applyStyle({ bold: !cellData.bold })} style={{ fontWeight: 'bold', padding: '4px 8px', cursor: 'pointer' }}>B</button>
      <button onClick={() => applyStyle({ italic: !cellData.italic })} style={{ fontStyle: 'italic', padding: '4px 8px', cursor: 'pointer' }}>I</button>
      <button onClick={() => applyStyle({ underline: !cellData.underline })} style={{ textDecoration: 'underline', padding: '4px 8px', cursor: 'pointer' }}>U</button>
      <input type="color" value={cellData.bgColor || '#ffffff'} onChange={(e) => applyStyle({ bgColor: e.target.value })} style={{ width: 30, height: 30, cursor: 'pointer' }} />
      <input type="color" value={cellData.textColor || '#000000'} onChange={(e) => applyStyle({ textColor: e.target.value })} style={{ width: 30, height: 30, cursor: 'pointer' }} />
      <select value={cellData.align || 'left'} onChange={(e) => applyStyle({ align: e.target.value as any })} style={{ padding: 4, cursor: 'pointer' }}>
        <option value="left">⬅️</option>
        <option value="center">⬌</option>
        <option value="right">➡️</option>
      </select>
      <select value={cellData.format || 'number'} onChange={(e) => applyStyle({ format: e.target.value as any })} style={{ padding: 4, cursor: 'pointer' }}>
        <option value="number">123</option>
        <option value="percent">%</option>
        <option value="currency">₽</option>
        <option value="date">📅</option>
      </select>
    </div>
  );
};

const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const documents = useAppSelector((state: RootState) => state.documents.list);
  const modalOpen = useAppSelector((state: RootState) => state.ui.modalOpen);
  const newDocName = useAppSelector((state: RootState) => state.ui.newDocName);
  const newDocRows = useAppSelector((state: RootState) => state.ui.newDocRows);
  const newDocCols = useAppSelector((state: RootState) => state.ui.newDocCols);
  const loading = useAppSelector((state: RootState) => state.documents.loading);
  const error = useAppSelector((state: RootState) => state.documents.error);
  const token = useAppSelector((state: RootState) => state.auth.token);

  React.useEffect(() => {
    if (token) {
      dispatch(loadUserDocuments());
    }
  }, [dispatch, token]);

  const getPreview = (data: Record<string, CellData>, rowsCount: number, colsCount: number) => {
    const preview: string[][] = [];
    for (let r = 0; r < Math.min(3, rowsCount); r++) {
      const row: string[] = [];
      for (let c = 0; c < Math.min(3, colsCount); c++) {
        const id = alphabet[c] + (r + 1);
        let val = data[id]?.res || data[id]?.raw || '';
        if (val.length > 10) val = val.slice(0, 10);
        row.push(val || '—');
      }
      preview.push(row);
    }
    return preview;
  };

  const handleOpenDocument = async (id: number) => {
    if (!token) return;
    const result = await dispatch(loadDocumentById({ id, token }));
    if (loadDocumentById.fulfilled.match(result) && result.payload) {
      const doc = result.payload;
      dispatch(spreadsheetSlice.actions.loadData({ data: doc.data, rows: doc.rows, cols: doc.cols }));
      navigate(`/documents/${id}`);
    } else if (result.payload === '403') {
      alert('Нет доступа к этому документу');
    }
  };

  const createDoc = () => {
    if (!newDocName.trim() || !token) return;
    dispatch(createDocumentInStorage({ name: newDocName, rows: newDocRows, cols: newDocCols, token }));
    dispatch(uiSlice.actions.setModalClose());
  };

  const renameDoc = (id: number, currentName: string) => {
    const newName = prompt('Новое название', currentName);
    if (newName && newName.trim() && token) {
      dispatch(renameDocumentInStorage({ id, newName: newName.trim(), token }));
    }
  };

  const duplicateDoc = (id: number) => {
    if (token) {
      dispatch(duplicateDocumentInStorage({ id, token }));
    }
  };

  const deleteDoc = (id: number) => {
    if (token && confirm('Удалить документ?')) {
      dispatch(deleteDocumentFromStorage({ id, token }));
    }
  };

  if (loading) return <div style={{ padding: 50, textAlign: 'center' }}>Загрузка...</div>;

  return (
    <div style={{ padding: 30 }}>
      <h1>Мои документы</h1>
      {error && <div style={{ color: 'red', marginBottom: 20 }}>{error}</div>}
      <button onClick={() => dispatch(uiSlice.actions.setModalOpen())} style={{ marginBottom: 20, padding: '8px 16px', cursor: 'pointer' }}>
        Новый документ
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {documents.map((doc) => {
          const preview = getPreview(doc.data, doc.rows, doc.cols);
          return (
            <div key={doc.id} style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8, cursor: 'pointer' }} onClick={() => handleOpenDocument(doc.id)}>
              <h3>{doc.name}</h3>
              <div style={{ fontSize: 12, color: '#666' }}>Обновлён: {new Date(doc.updatedAt).toLocaleString()}</div>
              <div style={{ background: '#f5f5f5', marginTop: 10, padding: 8 }}>
                {preview.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex' }}>
                    {row.map((cell, ci) => (
                      <div key={ci} style={{ border: '1px solid #ddd', background: 'white', padding: 4, width: 60, textAlign: 'center' }}>{cell}</div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={(e) => { e.stopPropagation(); renameDoc(doc.id, doc.name); }} style={{ marginRight: 8 }}>Переименовать</button>
                <button onClick={(e) => { e.stopPropagation(); duplicateDoc(doc.id); }} style={{ marginRight: 8 }}>Дублировать</button>
                <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}>Удалить</button>
              </div>
            </div>
          );
        })}
      </div>
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => dispatch(uiSlice.actions.setModalClose())}>
          <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 300 }} onClick={(e) => e.stopPropagation()}>
            <h3>Новый документ</h3>
            <input placeholder="Название" value={newDocName} onChange={(e) => dispatch(uiSlice.actions.setNewDocName(e.target.value))} style={{ width: '100%', margin: '10px 0', padding: 8 }} />
            <input type="number" placeholder="Строки" value={newDocRows} onChange={(e) => dispatch(uiSlice.actions.setNewDocRows(parseInt(e.target.value) || 1))} style={{ width: '100%', margin: '10px 0', padding: 8 }} />
            <input type="number" placeholder="Столбцы (max 26)" value={newDocCols} onChange={(e) => dispatch(uiSlice.actions.setNewDocCols(parseInt(e.target.value) || 1))} style={{ width: '100%', margin: '10px 0', padding: 8 }} />
            <button onClick={createDoc} style={{ marginRight: 8 }}>Создать</button>
            <button onClick={() => dispatch(uiSlice.actions.setModalClose())}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SpreadsheetPage = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const [shiftStartCell, setShiftStartCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('column_widths');
    return saved ? JSON.parse(saved) : {};
  });

  const data = useAppSelector((state: RootState) => state.spreadsheet.data);
  const rows = useAppSelector((state: RootState) => state.spreadsheet.rows);
  const cols = useAppSelector((state: RootState) => state.spreadsheet.cols);
  const selectedCell = useAppSelector((state: RootState) => state.spreadsheet.selectedCell);
  const selectedRange = useAppSelector((state: RootState) => state.spreadsheet.selectedRange);
  const saveStatus = useAppSelector((state: RootState) => state.spreadsheet.saveStatus);
  const currentName = useAppSelector((state: RootState) => state.documents.currentName);
  const currentId = useAppSelector((state: RootState) => state.documents.currentId);
  const contextMenu = useAppSelector((state: RootState) => state.ui.contextMenu);
  const showFormatPanel = useAppSelector((state: RootState) => state.ui.showFormatPanel);
  const token = useAppSelector((state: RootState) => state.auth.token);

  React.useEffect(() => {
    if (documentId && token) {
      const id = parseInt(documentId);
      dispatch(loadDocumentById({ id, token })).then((result) => {
        if (loadDocumentById.fulfilled.match(result) && result.payload) {
          const doc = result.payload;
          dispatch(spreadsheetSlice.actions.loadData({ data: doc.data, rows: doc.rows, cols: doc.cols }));
          dispatch(documentsSlice.actions.setCurrentDocument({ id: doc.id, name: doc.name }));
        } else if (result.payload === '403') {
          alert('Нет доступа к этому документу');
          navigate('/dashboard');
        }
      });
    }
  }, [dispatch, documentId, token, navigate]);

  React.useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (currentId && token && saveStatus === 'saving') {
      autoSaveTimer.current = setTimeout(() => {
        dispatch(saveDocumentToStorage({
          id: currentId,
          data,
          rows,
          cols,
          name: currentName,
          token,
        })).then(() => {
          dispatch(spreadsheetSlice.actions.setSaveStatus('saved'));
        }).catch(() => {
          dispatch(spreadsheetSlice.actions.setSaveStatus('error'));
        });
      }, 500);
    }
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [data, rows, cols, currentId, currentName, token, saveStatus, dispatch]);

  const startResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = columnWidths[col] || 90;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth >= 50) {
        setColumnWidths(prev => {
          const updated = { ...prev, [col]: newWidth };
          localStorage.setItem('column_widths', JSON.stringify(updated));
          return updated;
        });
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const updateCellValue = useCallback((id: string, value: string) => {
    dispatch(spreadsheetSlice.actions.updateCell({ id, value }));
    dispatch(spreadsheetSlice.actions.recalculateAll());
  }, [dispatch]);

  const startEdit = (id: string, currentValue: string) => {
    setEditingCell(id);
    setEditValue(currentValue);
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.setSelectionRange(currentValue.length, currentValue.length);
      }
    }, 10);
  };

  const finishEdit = (id: string) => {
    if (editingCell) {
      updateCellValue(id, editValue);
      setEditingCell(null);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  const handleCellClick = (id: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList?.contains('resize-handle')) return;

    if (e.shiftKey && shiftStartCell) {
      dispatch(spreadsheetSlice.actions.setSelectedRange(`${shiftStartCell}:${id}`));
    } else {
      setShiftStartCell(id);
      dispatch(spreadsheetSlice.actions.setSelectedCell(id));
      dispatch(spreadsheetSlice.actions.setSelectedRange(null));
    }

    const allCells = document.querySelectorAll('.cell');
    for (let i = 0; i < allCells.length; i++) {
      (allCells[i] as HTMLElement).style.background = '';
    }
    const el = document.getElementById(`cell-${id}`);
    if (el) (el as HTMLElement).style.background = '#e3f2fd';
    if (formulaInputRef.current) {
      formulaInputRef.current.value = data[id]?.raw || '';
    }
  };

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    dispatch(uiSlice.actions.setContextMenu({ show: true, x: e.clientX, y: e.clientY, row: rowIndex }));
  };

  const addRowBelow = (afterIndex: number) => {
    dispatch(spreadsheetSlice.actions.addRow(afterIndex));
    dispatch(spreadsheetSlice.actions.recalculateAll());
    dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null }));
  };

  const removeRow = (rowIndex: number) => {
    if (rows > 1) {
      dispatch(spreadsheetSlice.actions.deleteRow(rowIndex));
      dispatch(spreadsheetSlice.actions.recalculateAll());
    }
    dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null }));
  };

  const getDisplayValue = (cell: CellData): string => {
    if (cell.format && cell.format !== 'number' && !isNaN(parseFloat(cell.res))) {
      return formatCellValue(cell.res, cell.format);
    }
    return cell.res || cell.raw || '';
  };

  const exportToCSV = () => {
    let csvText = '';
    for (let r = 0; r < rows; r++) {
      const rowValues: string[] = [];
      for (let c = 0; c < cols; c++) {
        const id = alphabet[c] + (r + 1);
        let val = data[id]?.res || data[id]?.raw || '';
        if (val.includes(',') || val.includes('"')) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        rowValues.push(val);
      }
      csvText += rowValues.join(',') + '\n';
    }
    const blob = new Blob([csvText], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentName + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const toSave = { name: currentName, rows, cols, data };
    const blob = new Blob([JSON.stringify(toSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentName + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/);
        const newRowsCount = Math.min(lines.length, 200);
        for (let r = 0; r < newRowsCount; r++) {
          const colsData = lines[r].split(',');
          for (let c = 0; c < colsData.length && c < cols; c++) {
            const id = alphabet[c] + (r + 1);
            const rawValue = colsData[c].replace(/^"|"$/g, '');
            updateCellValue(id, rawValue);
          }
        }
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  };

  const saveDocManually = () => {
    if (currentId && token) {
      dispatch(spreadsheetSlice.actions.setSaveStatus('saving'));
      dispatch(saveDocumentToStorage({
        id: currentId,
        data,
        rows,
        cols,
        name: currentName,
        token,
      })).then(() => {
        dispatch(spreadsheetSlice.actions.setSaveStatus('saved'));
      }).catch(() => {
        dispatch(spreadsheetSlice.actions.setSaveStatus('error'));
      });
    }
  };

  React.useEffect(() => {
    const handleHotkeys = (e: KeyboardEvent) => {
      if (editingCell) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch(spreadsheetSlice.actions.undo());
        dispatch(spreadsheetSlice.actions.recalculateAll());
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        dispatch(spreadsheetSlice.actions.redo());
        dispatch(spreadsheetSlice.actions.recalculateAll());
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocManually();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        if (selectedRange) {
          dispatch(spreadsheetSlice.actions.copyToClipboard({ range: selectedRange, action: 'copy' }));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        if (selectedRange) {
          dispatch(spreadsheetSlice.actions.copyToClipboard({ range: selectedRange, action: 'cut' }));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        dispatch(spreadsheetSlice.actions.pasteFromClipboard({ targetCell: selectedCell }));
        dispatch(spreadsheetSlice.actions.recalculateAll());
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const cell = data[selectedCell];
        if (selectedRange) {
          dispatch(spreadsheetSlice.actions.updateRangeStyle({ range: selectedRange, styles: { bold: !cell?.bold } }));
        } else {
          dispatch(spreadsheetSlice.actions.updateCellStyle({ id: selectedCell, styles: { bold: !cell?.bold } }));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        const cell = data[selectedCell];
        if (selectedRange) {
          dispatch(spreadsheetSlice.actions.updateRangeStyle({ range: selectedRange, styles: { italic: !cell?.italic } }));
        } else {
          dispatch(spreadsheetSlice.actions.updateCellStyle({ id: selectedCell, styles: { italic: !cell?.italic } }));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        const cell = data[selectedCell];
        if (selectedRange) {
          dispatch(spreadsheetSlice.actions.updateRangeStyle({ range: selectedRange, styles: { underline: !cell?.underline } }));
        } else {
          dispatch(spreadsheetSlice.actions.updateCellStyle({ id: selectedCell, styles: { underline: !cell?.underline } }));
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedRange) {
          const [start, end] = selectedRange.split(':');
          const startCol = start.match(/[A-Z]+/)?.[0] || '';
          const startRow = parseInt(start.match(/\d+/)?.[0] || '0');
          const endCol = end.match(/[A-Z]+/)?.[0] || '';
          const endRow = parseInt(end.match(/\d+/)?.[0] || '0');
          const startIdx = alphabet.indexOf(startCol);
          const endIdx = alphabet.indexOf(endCol);
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startIdx; c <= endIdx; c++) {
              const id = alphabet[c] + r;
              if (data[id]) {
                dispatch(spreadsheetSlice.actions.clearCell(id));
              }
            }
          }
        } else {
          if (data[selectedCell]) {
            dispatch(spreadsheetSlice.actions.clearCell(selectedCell));
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const startId = 'A1';
        const endId = alphabet[cols - 1] + rows;
        dispatch(spreadsheetSlice.actions.setSelectedRange(`${startId}:${endId}`));
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const col = selectedCell.match(/[A-Z]+/)?.[0] || '';
        const row = parseInt(selectedCell.match(/\d+/)?.[0] || '0');
        const colIdx = alphabet.indexOf(col);
        if (colIdx < cols - 1) {
          dispatch(spreadsheetSlice.actions.setSelectedCell(alphabet[colIdx + 1] + row));
        } else {
          dispatch(spreadsheetSlice.actions.setSelectedCell('A' + (row + 1)));
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const row = parseInt(selectedCell.match(/\d+/)?.[0] || '0');
        if (row < rows) {
          dispatch(spreadsheetSlice.actions.setSelectedCell('A' + (row + 1)));
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        dispatch(spreadsheetSlice.actions.setSelectedRange(null));
        setEditingCell(null);
      }
    };

    window.addEventListener('keydown', handleHotkeys);
    return () => window.removeEventListener('keydown', handleHotkeys);
  }, [dispatch, selectedCell, selectedRange, rows, cols, data, editingCell, saveDocManually]);

  const visibleCols = useMemo(() => alphabet.slice(0, cols), [cols]);

  return (
    <div className="container" onClick={() => dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null }))}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <div>
          <button onClick={() => navigate('/dashboard')} style={{ marginRight: 12, cursor: 'pointer' }}>К списку</button>
          <strong>{currentName}</strong>
          <span style={{ marginLeft: 12, fontSize: 12, color: saveStatus === 'saved' ? 'green' : saveStatus === 'saving' ? 'orange' : 'red' }}>
            {saveStatus === 'saved' ? 'Сохранено' : saveStatus === 'saving' ? 'Сохранение...' : 'Ошибка'}
          </span>
        </div>
        <div>
          <button onClick={exportToCSV} style={{ cursor: 'pointer', marginRight: 8 }}>CSV</button>
          <button onClick={exportToJSON} style={{ cursor: 'pointer', marginRight: 8 }}>JSON</button>
          <button onClick={importFromCSV} style={{ cursor: 'pointer', marginRight: 8 }}>Импорт CSV</button>
          <button onClick={saveDocManually} style={{ cursor: 'pointer', marginRight: 8 }}>Сохранить (Ctrl+S)</button>
          <button onClick={() => dispatch(uiSlice.actions.setShowFormatPanel(!showFormatPanel))} style={{ cursor: 'pointer' }}>📐 Формат</button>
        </div>
      </div>

      {showFormatPanel && <FormatPanel />}

      <div className="formula-bar">
        <div className="cell-ref">{selectedCell}</div>
        <input
          ref={formulaInputRef}
          className="formula-input"
          value={data[selectedCell]?.raw || ''}
          onChange={(e) => updateCellValue(selectedCell, e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="corner">#</th>
              {visibleCols.map(letter => (
                <th key={letter} style={{ width: columnWidths[letter] || 90, position: 'relative', minWidth: 50 }}>
                  {letter}
                  <div
                    className="resize-handle"
                    style={{
                      position: 'absolute',
                      right: -3,
                      top: 0,
                      width: 6,
                      height: '100%',
                      cursor: 'col-resize',
                      zIndex: 20,
                      backgroundColor: 'transparent',
                    }}
                    onMouseDown={(e) => startResize(letter, e)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                <th className="row-header" onContextMenu={(e) => handleContextMenu(e, rowIndex)}>{rowIndex + 1}</th>
                {visibleCols.map((letter) => {
                  const cellId = letter + (rowIndex + 1);
                  const cell = data[cellId] || createEmptyCell();

                  const cellStyle: React.CSSProperties = {
                    fontWeight: cell.bold ? 'bold' : 'normal',
                    fontStyle: cell.italic ? 'italic' : 'normal',
                    textDecoration: cell.underline ? 'underline' : 'none',
                    backgroundColor: cell.bgColor || '#ffffff',
                    color: cell.textColor || '#000000',
                    textAlign: (cell.align as any) || 'left',
                    width: columnWidths[letter] || 90,
                  };

                  return (
                    <td
                      key={cellId}
                      id={`cell-${cellId}`}
                      className="cell"
                      style={cellStyle}
                      onClick={(e) => handleCellClick(cellId, e)}
                      onDoubleClick={() => startEdit(cellId, cell.raw || '')}
                    >
                      {editingCell === cellId ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => finishEdit(cellId)}
                          onKeyDown={(e) => handleEditKeyDown(e, cellId)}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            outline: '2px solid #007bff',
                            padding: '4px 8px',
                            margin: 0,
                            background: 'white',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                          }}
                        />
                      ) : (
                        <div className="cell-content" style={{ cursor: 'text' }}>
                          {getDisplayValue(cell)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu.show && contextMenu.row !== null && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div onClick={() => addRowBelow(contextMenu.row!)} style={{ cursor: 'pointer' }}>Добавить строку ниже</div>
          <div onClick={() => removeRow(contextMenu.row!)} style={{ cursor: 'pointer' }}>Удалить строку</div>
          <hr />
          <div onClick={() => dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null }))} style={{ cursor: 'pointer' }}>Отмена</div>
        </div>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const documents = useAppSelector((state: RootState) => state.documents.list);
  const [newName, setNewName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameMessage, setNameMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const authError = useAppSelector((state: RootState) => state.auth.error);

  const handleChangeName = async () => {
    if (!newName.trim() || !user) return;
    const result = await dispatch(updateUserName({ userId: user.id, newName: newName.trim() }));
    if (updateUserName.fulfilled.match(result)) {
      setNameMessage('Имя изменено');
      setTimeout(() => setNameMessage(''), 3000);
      setNewName('');
    } else {
      setNameMessage('Ошибка');
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage('Пароль должен быть не менее 8 символов');
      return;
    }
    const result = await dispatch(changePassword({ userId: user.id, oldPassword, newPassword }));
    if (changePassword.fulfilled.match(result)) {
      setPasswordMessage('Пароль изменён');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMessage(authError || 'Ошибка смены пароля');
    }
    setTimeout(() => setPasswordMessage(''), 3000);
  };

  return (
    <div style={{ padding: 30, maxWidth: 600, margin: '0 auto' }}>
      <h1>Профиль</h1>
      <div style={{ marginTop: 20, padding: 20, background: '#f8f9fa', borderRadius: 8 }}>
        <p><strong>Имя:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Количество документов:</strong> {documents.length}</p>
        <p><strong>Дата регистрации:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}</p>
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Изменить имя</h3>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <input type="text" placeholder="Новое имя" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          <button onClick={handleChangeName} style={{ padding: '8px 16px', cursor: 'pointer' }}>Сохранить</button>
        </div>
        {nameMessage && <div style={{ color: nameMessage.includes('изменено') ? 'green' : 'red', marginTop: 5 }}>{nameMessage}</div>}
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Сменить пароль</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          <input type="password" placeholder="Старый пароль" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          <input type="password" placeholder="Новый пароль (мин. 8 символов)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          <input type="password" placeholder="Подтверждение пароля" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          <button onClick={handleChangePassword} style={{ padding: '8px 16px', cursor: 'pointer', alignSelf: 'flex-start' }}>Сменить пароль</button>
        </div>
        {passwordMessage && <div style={{ color: passwordMessage.includes('изменён') ? 'green' : 'red', marginTop: 5 }}>{passwordMessage}</div>}
      </div>
    </div>
  );
};

const NotFoundPage = () => (
  <div style={{ textAlign: 'center', padding: 50 }}>
    <h1>404</h1>
    <Link to="/dashboard">Вернуться</Link>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const currentName = useAppSelector((state: RootState) => state.documents.currentName);
  const user = useAppSelector((state: RootState) => state.auth.user);

  const getBreadcrumbs = () => {
    if (location.pathname === '/dashboard') return <span>Мои документы</span>;
    if (location.pathname.includes('/documents/')) return <span><Link to="/dashboard">Мои документы</Link> → {currentName || 'Документ'}</span>;
    if (location.pathname === '/profile') return <span>Профиль</span>;
    return null;
  };

  const handleLogout = () => {
    dispatch(authSlice.actions.logout());
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#2c3e50', color: 'white' }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Таблицы</Link>
          <Link to="/profile" style={{ color: 'white', textDecoration: 'none' }}>Профиль</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}>Выйти</button>
        </div>
      </div>
      <div style={{ padding: '8px 20px', background: '#ecf0f1', fontSize: 14 }}>{getBreadcrumbs()}</div>
      <div style={{ flex: 1, overflow: 'auto' }}><Outlet /></div>
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents/:documentId" element={<SpreadsheetPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;