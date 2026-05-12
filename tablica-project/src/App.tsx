import React, { useState, useEffect, useRef } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import './App.css';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const defaultRows = 100;
const defaultCols = 26;

interface CellData {
  raw: string;
  res: string;
}

interface Document {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  rows: number;
  cols: number;
  data: Record<string, CellData>;
}

let columnWidthsStore: Record<string, number> = {};

const loadColumnWidths = () => {
  const saved = localStorage.getItem('column_widths');
  if (saved) {
    columnWidthsStore = JSON.parse(saved);
  }
};

const createEmptyData = (rows: number, cols: number): Record<string, CellData> => {
  const empty: Record<string, CellData> = {};
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < Math.min(cols, alphabet.length); j++) {
      const id = alphabet[j] + (i + 1);
      empty[id] = { raw: '', res: '' };
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

export const loadDocuments = createAsyncThunk(
  'documents/load',
  async () => {
    loadColumnWidths();
    const saved = localStorage.getItem('my_docs');
    let allDocs = saved ? JSON.parse(saved) : [];
    
    if (!allDocs.length) {
      const empty = createEmptyData(defaultRows, defaultCols);
      const firstDoc = {
        id: Date.now(),
        name: 'Моя таблица',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rows: defaultRows,
        cols: defaultCols,
        data: empty,
      };
      allDocs = [firstDoc];
      localStorage.setItem('my_docs', JSON.stringify(allDocs));
    }
    
    return allDocs;
  }
);

export const loadDocumentById = createAsyncThunk(
  'documents/loadById',
  async (id: number, { dispatch, getState }) => {
    const state = getState() as any;
    const doc = state.documents.list.find((d: Document) => d.id === id);
    if (!doc) throw new Error('Документ не найден');
    dispatch(spreadsheetSlice.actions.loadData({ data: doc.data, rows: doc.rows, cols: doc.cols }));
    return { id, name: doc.name };
  }
);

export const saveDocument = createAsyncThunk(
  'documents/save',
  async (_, { getState, dispatch }) => {
    const state = getState() as any;
    const currentId = state.documents.currentId;
    const data = state.spreadsheet.data;
    const rows = state.spreadsheet.rows;
    const cols = state.spreadsheet.cols;
    const list = state.documents.list;
    
    if (!currentId) return;
    
    const updated = list.map((doc: Document) => {
      if (doc.id === currentId) {
        return { ...doc, data, rows, cols, updatedAt: new Date().toISOString() };
      }
      return doc;
    });
    
    localStorage.setItem('my_docs', JSON.stringify(updated));
    dispatch(spreadsheetSlice.actions.setSaveStatus('Сохранено'));
    return updated;
  }
);

export const createDocument = createAsyncThunk(
  'documents/create',
  async ({ name, rows, cols }: { name: string; rows: number; cols: number }, { dispatch, getState }) => {
    const empty = createEmptyData(rows, cols);
    const newDoc = {
      id: Date.now(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rows,
      cols: Math.min(cols, alphabet.length),
      data: empty,
    };
    
    const state = getState() as any;
    const newList = [...state.documents.list, newDoc];
    localStorage.setItem('my_docs', JSON.stringify(newList));
    
    dispatch(spreadsheetSlice.actions.loadData({ data: empty, rows, cols: Math.min(cols, alphabet.length) }));
    return newList;
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/delete',
  async (id: number, { getState, dispatch }) => {
    const state = getState() as any;
    const newList = state.documents.list.filter((d: Document) => d.id !== id);
    localStorage.setItem('my_docs', JSON.stringify(newList));
    
    if (state.documents.currentId === id && newList.length > 0) {
      dispatch(loadDocumentById(newList[0].id));
    }
    return newList;
  }
);

export const renameDocument = createAsyncThunk(
  'documents/rename',
  async ({ id, newName }: { id: number; newName: string }, { getState }) => {
    if (!newName) return;
    const state = getState() as any;
    const newList = state.documents.list.map((doc: Document) => {
      if (doc.id === id) {
        return { ...doc, name: newName, updatedAt: new Date().toISOString() };
      }
      return doc;
    });
    localStorage.setItem('my_docs', JSON.stringify(newList));
    return { newList, id, newName };
  }
);

export const duplicateDocument = createAsyncThunk(
  'documents/duplicate',
  async (id: number, { getState }) => {
    const state = getState() as any;
    const original = state.documents.list.find((d: Document) => d.id === id);
    if (!original) return;
    
    const copy = {
      ...original,
      id: Date.now(),
      name: original.name + ' - копия',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const newList = [...state.documents.list, copy];
    localStorage.setItem('my_docs', JSON.stringify(newList));
    return newList;
  }
);

const spreadsheetSlice = createSlice({
  name: 'spreadsheet',
  initialState: {
    data: createEmptyData(defaultRows, defaultCols),
    rows: defaultRows,
    cols: defaultCols,
    selectedCell: 'A1',
    selectedRange: null as string | null,
    history: [] as Record<string, CellData>[],
    historyIndex: -1,
    saveStatus: 'Сохранено',
  },
  reducers: {
    updateCell(state, action: PayloadAction<{ id: string; value: string }>) {
      const { id, value } = action.payload;
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.data)));
      state.history = newHistory;
      state.historyIndex = newHistory.length - 1;
      
      if (value[0] === '=') {
        const res = calculateFormula(state.data, value);
        state.data[id] = { raw: value, res };
      } else {
        state.data[id] = { raw: value, res: value };
      }
      state.saveStatus = 'Сохранение...';
    },
    
    undo(state) {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.data = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.saveStatus = 'Сохранение...';
      }
    },
    
    redo(state) {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.data = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.saveStatus = 'Сохранение...';
      }
    },
    
    setSaveStatus(state, action: PayloadAction<string>) {
      state.saveStatus = action.payload;
    },
    
    recalculateAll(state) {
      state.data = recalculateAll(state.data);
    },
    
    setSelectedCell(state, action: PayloadAction<string>) {
      state.selectedCell = action.payload;
    },
    
    setSelectedRange(state, action: PayloadAction<string | null>) {
      state.selectedRange = action.payload;
    },
    
    loadData(state, action: PayloadAction<{ data: Record<string, CellData>; rows: number; cols: number }>) {
      state.data = action.payload.data;
      state.rows = action.payload.rows;
      state.cols = action.payload.cols;
      state.history = [];
      state.historyIndex = -1;
    },
    
    addRow(state, action: PayloadAction<number>) {
      const after = action.payload;
      const insertAt = after + 1;
      const newData: Record<string, CellData> = {};
      for (const key in state.data) {
        const col = key.match(/[A-Z]+/)?.[0] || '';
        const row = parseInt(key.match(/\d+/)?.[0] || '0');
        if (row <= insertAt) {
          newData[key] = state.data[key];
        } else {
          newData[col + (row + 1)] = state.data[key];
        }
      }
      state.data = newData;
      state.rows++;
    },
    
    deleteRow(state, action: PayloadAction<number>) {
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
    },
    
    addColumn(state, action: PayloadAction<number>) {
      const afterIdx = action.payload;
      if (state.cols >= alphabet.length) return;
      
      const newData: Record<string, CellData> = {};
      for (let r = 1; r <= state.rows; r++) {
        for (let c = 0; c < state.cols + 1; c++) {
          if (c <= afterIdx) {
            const oldId = alphabet[c] + r;
            if (state.data[oldId]) {
              newData[oldId] = state.data[oldId];
            }
          } else {
            const newId = alphabet[c] + r;
            const oldIdShift = alphabet[c - 1] + r;
            if (state.data[oldIdShift]) {
              newData[newId] = state.data[oldIdShift];
            }
          }
        }
      }
      
      for (let r = 1; r <= state.rows; r++) {
        const newCellId = alphabet[afterIdx + 1] + r;
        if (!newData[newCellId]) {
          newData[newCellId] = { raw: '', res: '' };
        }
      }
      
      state.data = newData;
      state.cols++;
    },
    
    deleteColumn(state, action: PayloadAction<number>) {
      const idx = action.payload;
      const newData: Record<string, CellData> = {};
      for (const key in state.data) {
        const col = key.match(/[A-Z]+/)?.[0] || '';
        const row = parseInt(key.match(/\d+/)?.[0] || '0');
        const colIdx = alphabet.indexOf(col);
        
        if (colIdx === idx) continue;
        
        if (colIdx > idx) {
          const newId = alphabet[colIdx - 1] + row;
          newData[newId] = state.data[key];
        } else {
          newData[key] = state.data[key];
        }
      }
      
      state.data = newData;
      state.cols--;
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
  },
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDocuments.pending, (state) => { state.loading = true; })
      .addCase(loadDocuments.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
        if (action.payload.length > 0 && !state.currentId) {
          state.currentId = action.payload[0].id;
          state.currentName = action.payload[0].name;
        }
      })
      .addCase(loadDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка загрузки';
      })
      .addCase(loadDocumentById.pending, (state) => { state.loading = true; })
      .addCase(loadDocumentById.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentId = action.payload.id;
          state.currentName = action.payload.name;
        }
        state.loading = false;
      })
      .addCase(loadDocumentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка загрузки документа';
      })
      .addCase(saveDocument.fulfilled, (state, action) => {
        if (action.payload) state.list = action.payload;
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.list = action.payload;
        if (action.payload.length > 0) {
          const last = action.payload[action.payload.length - 1];
          state.currentId = last.id;
          state.currentName = last.name;
        }
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.list = action.payload;
        if (action.payload.length > 0 && state.currentId) {
          const exists = action.payload.some((d: Document) => d.id === state.currentId);
          if (!exists) {
            state.currentId = action.payload[0].id;
            state.currentName = action.payload[0].name;
          }
        }
      })
      .addCase(renameDocument.fulfilled, (state, action) => {
        if (action.payload) {
          state.list = action.payload.newList;
          if (state.currentId === action.payload.id) {
            state.currentName = action.payload.newName;
          }
        }
      })
      .addCase(duplicateDocument.fulfilled, (state, action) => {
        if (action.payload) {
          state.list = action.payload;
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
    contextMenu: { show: false, x: 0, y: 0, row: null as number | null, col: null as number | null },
  },
  reducers: {
    setModalOpen: (state) => { state.modalOpen = true; },
    setModalClose: (state) => { state.modalOpen = false; },
    setNewDocName: (state, action: PayloadAction<string>) => { state.newDocName = action.payload; },
    setNewDocRows: (state, action: PayloadAction<number>) => { state.newDocRows = action.payload; },
    setNewDocCols: (state, action: PayloadAction<number>) => { state.newDocCols = action.payload; },
    setContextMenu: (state, action: PayloadAction<{ show: boolean; x: number; y: number; row: number | null; col: number | null }>) => {
      state.contextMenu = action.payload;
    },
  },
});

const store = configureStore({
  reducer: {
    spreadsheet: spreadsheetSlice.reducer,
    documents: documentsSlice.reducer,
    ui: uiSlice.reducer,
  },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector: <T>(selector: (state: RootState) => T) => T = useSelector;

const App = () => {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state: RootState) => state.spreadsheet.data);
  const rows = useAppSelector((state: RootState) => state.spreadsheet.rows);
  const cols = useAppSelector((state: RootState) => state.spreadsheet.cols);
  const selectedCell = useAppSelector((state: RootState) => state.spreadsheet.selectedCell);
  const selectedRange = useAppSelector((state: RootState) => state.spreadsheet.selectedRange);
  const saveStatus = useAppSelector((state: RootState) => state.spreadsheet.saveStatus);
  const documents = useAppSelector((state: RootState) => state.documents.list);
  const currentName = useAppSelector((state: RootState) => state.documents.currentName);
  const modalOpen = useAppSelector((state: RootState) => state.ui.modalOpen);
  const newDocName = useAppSelector((state: RootState) => state.ui.newDocName);
  const newDocRows = useAppSelector((state: RootState) => state.ui.newDocRows);
  const newDocCols = useAppSelector((state: RootState) => state.ui.newDocCols);
  const contextMenu = useAppSelector((state: RootState) => state.ui.contextMenu);
  const loading = useAppSelector((state: RootState) => state.documents.loading);
  const error = useAppSelector((state: RootState) => state.documents.error);
  const [showDocList, setShowDocList] = useState(true);
  const [shiftStartCell, setShiftStartCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('column_widths');
    const defaultWidths: Record<string, number> = {};
    alphabet.forEach(letter => { defaultWidths[letter] = 90; });
    return saved ? JSON.parse(saved) : defaultWidths;
  });
  
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'Сохранение...') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [saveStatus]);
  
  useEffect(() => {
    dispatch(loadDocuments());
  }, [dispatch]);
  
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      dispatch(saveDocument());
    }, 500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [data, dispatch]);
  
  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
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
        dispatch(saveDocument());
      }
    };
    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [dispatch]);
  
  useEffect(() => {
    const handleGlobalMouseMove = (moveEvent: MouseEvent) => {
      if (resizingCol) {
        const newWidth = resizeStartWidth + (moveEvent.clientX - resizeStartX);
        if (newWidth >= 40) {
          setColumnWidths(prev => {
            const updated = { ...prev, [resizingCol]: newWidth };
            localStorage.setItem('column_widths', JSON.stringify(updated));
            return updated;
          });
        }
      }
    };
    
    const handleGlobalMouseUp = () => {
      if (resizingCol) {
        setResizingCol(null);
      }
    };
    
    if (resizingCol) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [resizingCol, resizeStartX, resizeStartWidth]);
  
  const startResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(col);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[col] || 90);
  };
  
  const updateCellValue = (id: string, value: string) => {
    dispatch(spreadsheetSlice.actions.updateCell({ id, value }));
    dispatch(spreadsheetSlice.actions.recalculateAll());
  };
  
  const startEdit = (id: string) => {
    setEditingCell(id);
    setEditValue(data[id]?.raw || '');
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
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
      const range = `${shiftStartCell}:${id}`;
      dispatch(spreadsheetSlice.actions.setSelectedRange(range));
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
  
  const handleRowContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    dispatch(uiSlice.actions.setContextMenu({ show: true, x: e.clientX, y: e.clientY, row: rowIndex, col: null }));
  };
  
  const handleColContextMenu = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    dispatch(uiSlice.actions.setContextMenu({ show: true, x: e.clientX, y: e.clientY, row: null, col: colIndex }));
  };
  
  const addRowBelow = (afterIndex: number) => {
    dispatch(spreadsheetSlice.actions.addRow(afterIndex));
    dispatch(spreadsheetSlice.actions.recalculateAll());
    dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null, col: null }));
  };
  
  const deleteRowAt = (rowIndex: number) => {
    dispatch(spreadsheetSlice.actions.deleteRow(rowIndex));
    dispatch(spreadsheetSlice.actions.recalculateAll());
    dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null, col: null }));
  };
  
  const addColumnAfter = (afterIndex: number) => {
    dispatch(spreadsheetSlice.actions.addColumn(afterIndex));
    dispatch(spreadsheetSlice.actions.recalculateAll());
    dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null, col: null }));
  };
  
  const deleteColumnAt = (colIndex: number) => {
    dispatch(spreadsheetSlice.actions.deleteColumn(colIndex));
    dispatch(spreadsheetSlice.actions.recalculateAll());
    dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null, col: null }));
  };
  
  const getPreview = (docData: Record<string, CellData>, rowsCount: number, colsCount: number) => {
    const preview: string[][] = [];
    for (let r = 0; r < Math.min(3, rowsCount); r++) {
      const row: string[] = [];
      for (let c = 0; c < Math.min(3, colsCount); c++) {
        const id = alphabet[c] + (r + 1);
        let val = docData[id]?.res || docData[id]?.raw || '';
        if (val.length > 10) val = val.slice(0, 10);
        row.push(val || '—');
      }
      preview.push(row);
    }
    return preview;
  };
  
  const handleOpenDocument = async (id: number) => {
    const result = await dispatch(loadDocumentById(id));
    if (loadDocumentById.fulfilled.match(result)) {
      setShowDocList(false);
    }
  };
  
  const createNewDoc = () => {
    if (!newDocName.trim()) return;
    dispatch(createDocument({ name: newDocName, rows: newDocRows, cols: newDocCols }));
    dispatch(uiSlice.actions.setModalClose());
    
    const newWidths: Record<string, number> = {};
    alphabet.forEach(letter => { newWidths[letter] = 90; });
    setColumnWidths(newWidths);
    localStorage.setItem('column_widths', JSON.stringify(newWidths));
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
          const csvCols = lines[r].split(',');
          for (let c = 0; c < csvCols.length && c < cols; c++) {
            const id = alphabet[c] + (r + 1);
            const rawValue = csvCols[c].replace(/^"|"$/g, '');
            dispatch(spreadsheetSlice.actions.updateCell({ id, value: rawValue }));
          }
        }
        dispatch(spreadsheetSlice.actions.recalculateAll());
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  };
  
  if (showDocList) {
    return (
      <div style={{ padding: 30 }}>
        <h1>Мои документы</h1>
        {error && <div style={{ color: 'red', marginBottom: 20 }}>{error}</div>}
        <button onClick={() => dispatch(uiSlice.actions.setModalOpen())} style={{ marginBottom: 20, padding: '8px 16px', cursor: 'pointer' }}>
          Новый документ
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {documents.map((doc: Document) => {
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
                  <button onClick={(e) => { e.stopPropagation(); dispatch(renameDocument({ id: doc.id, newName: prompt('Новое название') || '' })); }}>Переименовать</button>
                  <button onClick={(e) => { e.stopPropagation(); dispatch(duplicateDocument(doc.id)); }}>Дублировать</button>
                  <button onClick={(e) => { e.stopPropagation(); dispatch(deleteDocument(doc.id)); }}>Удалить</button>
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
              <input type="number" placeholder="Столбцы (max 26)" value={newDocCols} onChange={(e) => dispatch(uiSlice.actions.setNewDocCols(Math.min(parseInt(e.target.value) || 1, 26)))} style={{ width: '100%', margin: '10px 0', padding: 8 }} />
              <button onClick={createNewDoc}>Создать</button>
              <button onClick={() => dispatch(uiSlice.actions.setModalClose())}>Отмена</button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  const visibleCols = alphabet.slice(0, cols);
  
  return (
    <div className="container" onClick={() => dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null, col: null }))}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <div>
          <button onClick={() => setShowDocList(true)} style={{ marginRight: 12, cursor: 'pointer' }}>К списку</button>
          <strong>{currentName}</strong>
          <span style={{ marginLeft: 12, fontSize: 12, color: saveStatus === 'Сохранено' ? 'green' : 'orange' }}>{saveStatus}</span>
        </div>
        <div>
          <button onClick={exportToCSV} style={{ cursor: 'pointer' }}>CSV</button>
          <button onClick={exportToJSON} style={{ cursor: 'pointer' }}>JSON</button>
          <button onClick={importFromCSV} style={{ cursor: 'pointer' }}>Импорт CSV</button>
          <button onClick={() => dispatch(saveDocument())} style={{ cursor: 'pointer' }}>Сохранить (Ctrl+S)</button>
        </div>
      </div>
      
      <div className="formula-bar">
        <div className="cell-ref">{selectedCell}</div>
        <input ref={formulaInputRef} className="formula-input" onChange={(e) => updateCellValue(selectedCell, e.target.value)} />
      </div>
      
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="corner" style={{ position: 'sticky', left: 0, zIndex: 20, width: 50 }}>#</th>
              {visibleCols.map((letter, idx) => (
                <th
                  key={letter}
                  style={{
                    width: columnWidths[letter] || 90,
                    minWidth: 50,
                    position: 'relative',
                  }}
                  onContextMenu={(e) => handleColContextMenu(e, idx)}
                >
                  {letter}
                  <div
                    className="resize-handle"
                    style={{
                      position: 'absolute',
                      right: -4,
                      top: 0,
                      width: 8,
                      height: '100%',
                      cursor: 'col-resize',
                      zIndex: 20,
                      backgroundColor: 'rgba(0,0,0,0.1)',
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
                <th
                  className="row-header"
                  style={{ position: 'sticky', left: 0, zIndex: 10 }}
                  onContextMenu={(e) => handleRowContextMenu(e, rowIndex)}
                >
                  {rowIndex + 1}
                </th>
                {visibleCols.map((letter) => {
                  const cellId = letter + (rowIndex + 1);
                  const cell = data[cellId] || { raw: '', res: '' };
                  const isSelected = selectedRange?.includes(cellId) || selectedCell === cellId;
                  
                  return (
                    <td
                      key={cellId}
                      id={`cell-${cellId}`}
                      className="cell"
                      style={{
                        width: columnWidths[letter] || 90,
                        backgroundColor: isSelected ? '#e3f2fd' : 'white',
                      }}
                      onClick={(e) => handleCellClick(cellId, e)}
                      onDoubleClick={() => startEdit(cellId)}
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
                          {cell.res || cell.raw || ''}
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
          <div onClick={() => deleteRowAt(contextMenu.row!)} style={{ cursor: 'pointer' }}>Удалить строку</div>
          <hr />
          <div onClick={() => dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null, col: null }))} style={{ cursor: 'pointer' }}>Отмена</div>
        </div>
      )}
      
      {contextMenu.show && contextMenu.col !== null && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div onClick={() => addColumnAfter(contextMenu.col!)} style={{ cursor: 'pointer' }}>Добавить столбец справа</div>
          <div onClick={() => deleteColumnAt(contextMenu.col!)} style={{ cursor: 'pointer' }}>Удалить столбец</div>
          <hr />
          <div onClick={() => dispatch(uiSlice.actions.setContextMenu({ show: false, x: 0, y: 0, row: null, col: null }))} style={{ cursor: 'pointer' }}>Отмена</div>
        </div>
      )}
    </div>
  );
};

function RootApp() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}

export default RootApp;