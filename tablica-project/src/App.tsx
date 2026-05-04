import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const alfavit = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const defaultRows = 100;

function App() {
  const [inf, setInf] = useState({});
  const [kolvoStrok, setKolvoStrok] = useState(defaultRows);
  const [vibrano, setVibrano] = useState('A1');
  const [redakt, setRedakt] = useState(false);
  const [menushka, setMenushka] = useState({ show: false, x: 0, y: 0, row: null });
  
  const [vseDocs, setVseDocs] = useState([]);
  const [tekDocId, setTekDocId] = useState(null);
  const [pokazatSpisok, setPokazatSpisok] = useState(true);
  const [okno, setOkno] = useState(false);
  const [imyaNovogo, setImyaNovogo] = useState('');
  const [skolkoStrok, setSkolkoStrok] = useState(20);
  const [skolkoStolbcov, setSkolkoStolbcov] = useState(10);
  const [statusSave, setStatusSave] = useState('Сохранено');
  const [nazvanie, setNazvanie] = useState('');
  
  const inputYacheyka = useRef(null);
  const inputFormula = useRef(null);
  const timerSave = useRef(null);

  useEffect(() => {
    let izLocal = localStorage.getItem('my_docs');
    if (izLocal) {
      let razobrali = JSON.parse(izLocal);
      setVseDocs(razobrali);
      if (razobrali.length > 0) {
        setTekDocId(razobrali[0].id);
        setNazvanie(razobrali[0].name);
        setKolvoStrok(razobrali[0].rows);
        setInf(razobrali[0].data);
        setPokazatSpisok(false);
      }
    } else {
      let pustoi = {};
      for (let i = 0; i < defaultRows; i++) {
        for (let j = 0; j < alfavit.length; j++) {
          let id = alfavit[j] + (i + 1);
          pustoi[id] = { raw: '', res: '' };
        }
      }
      let pervoe = {
        id: Date.now(),
        name: 'Моя таблица',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rows: defaultRows,
        cols: alfavit.length,
        data: pustoi,
      };
      setVseDocs([pervoe]);
      setTekDocId(pervoe.id);
      setNazvanie(pervoe.name);
      setKolvoStrok(defaultRows);
      setInf(pustoi);
      setPokazatSpisok(false);
      localStorage.setItem('my_docs', JSON.stringify([pervoe]));
    }
  }, []);

  function sohranitVseDocs(docs) {
    localStorage.setItem('my_docs', JSON.stringify(docs));
    setVseDocs(docs);
  }

  function obnovitDoc(novInf, novoeKolvoStrok) {
    if (!tekDocId) return;
    let izmenennie = vseDocs.map(doc => {
      if (doc.id === tekDocId) {
        return {
          ...doc,
          data: novInf,
          rows: novoeKolvoStrok !== undefined ? novoeKolvoStrok : doc.rows,
          updatedAt: new Date().toISOString(),
        };
      }
      return doc;
    });
    sohranitVseDocs(izmenennie);
    setInf(novInf);
    if (novoeKolvoStrok !== undefined) setKolvoStrok(novoeKolvoStrok);
  }

  
  function poluchitZnacheniyaIzRange(ryndzh) {
    let chasti = ryndzh.split(':');
    let start = chasti[0];
    let end = chasti[1];
    
    let startBukva = start.match(/[A-Z]+/)[0];
    let startCifra = parseInt(start.match(/\d+/)[0]);
    let endBukva = end.match(/[A-Z]+/)[0];
    let endCifra = parseInt(end.match(/\d+/)[0]);
    
    let rez = [];
    let startIdx = alfavit.indexOf(startBukva);
    let endIdx = alfavit.indexOf(endBukva);
    
    for (let r = startCifra; r <= endCifra; r++) {
      for (let c = startIdx; c <= endIdx; c++) {
        let id = alfavit[c] + r;
        let chislo = parseFloat(inf[id]?.res) || 0;
        rez.push(chislo);
      }
    }
    return rez;
  }

  function summaRyang(ryndzh) {
    let vals = poluchitZnacheniyaIzRange(ryndzh);
    let total = 0;
    for (let i = 0; i < vals.length; i++) total += vals[i];
    return total;
  }

  function sredneeRyang(ryndzh) {
    let vals = poluchitZnacheniyaIzRange(ryndzh);
    if (vals.length === 0) return 0;
    let total = 0;
    for (let i = 0; i < vals.length; i++) total += vals[i];
    return total / vals.length;
  }

  function poschitatFormula(f) {
    if (!f || f[0] !== '=') return f;
    
    let virazhenie = f.slice(1).toUpperCase();
    
    let sumMatch = virazhenie.match(/SUM\([A-Z]+\d+:[A-Z]+\d+\)/);
    while (sumMatch) {
      let rng = sumMatch[0].slice(4, -1);
      let val = summaRyang(rng);
      virazhenie = virazhenie.replace(sumMatch[0], val);
      sumMatch = virazhenie.match(/SUM\([A-Z]+\d+:[A-Z]+\d+\)/);
    }
    
    let avgMatch = virazhenie.match(/AVERAGE\([A-Z]+\d+:[A-Z]+\d+\)/);
    while (avgMatch) {
      let rng = avgMatch[0].slice(8, -1);
      let val = sredneeRyang(rng);
      virazhenie = virazhenie.replace(avgMatch[0], val);
      avgMatch = virazhenie.match(/AVERAGE\([A-Z]+\d+:[A-Z]+\d+\)/);
    }
    
    let ssylki = virazhenie.match(/[A-Z]+\d+/g);
    if (ssylki) {
      for (let i = 0; i < ssylki.length; i++) {
        let ss = ssylki[i];
        let val = inf[ss]?.res || '0';
        let re = new RegExp(ss, 'g');
        virazhenie = virazhenie.replace(re, val);
      }
    }
    
    try {
      let itog = eval(virazhenie);
      return String(itog);
    } catch(e) {
      return '#ОШИБКА';
    }
  }

  function pereschitatVse(tekuschieDannye) {
    let novoe = { ...tekuschieDannye };
    for (let id in novoe) {
      if (novoe[id].raw && novoe[id].raw[0] === '=') {
        let novRez = poschitatFormula(novoe[id].raw);
        if (novRez !== novoe[id].res) {
          novoe[id] = { ...novoe[id], res: novRez };
        }
      }
    }
    return novoe;
  }

  function pomenyatYacheyku(id, znach) {
    if (!tekDocId) return;
    
    let novyeDannye = { ...inf };
    
    if (znach[0] === '=') {
      let rez = poschitatFormula(znach);
      novyeDannye[id] = { raw: znach, res: rez };
    } else {
      novyeDannye[id] = { raw: znach, res: znach };
    }
    
    novyeDannye = pereschitatVse(novyeDannye);
    setInf(novyeDannye);
    
    if (timerSave.current) clearTimeout(timerSave.current);
    setStatusSave('Сохранение...');
    
    timerSave.current = setTimeout(() => {
      obnovitDoc(novyeDannye);
      setStatusSave('Сохранено');
    }, 500);
    
    if (inputFormula.current && vibrano === id) {
      inputFormula.current.value = znach;
    }
  }

  function dobavitStroku(posle) {
    let novoe = {};
    let vstavka = posle + 1;
    
    for (let key in inf) {
      let b = key.match(/[A-Z]+/)[0];
      let n = parseInt(key.match(/\d+/)[0]);
      
      if (n <= vstavka) {
        novoe[key] = inf[key];
      } else {
        let novKey = b + (n + 1);
        novoe[novKey] = inf[key];
      }
    }
    
    let novKolvo = kolvoStrok + 1;
    setInf(novoe);
    setKolvoStrok(novKolvo);
    obnovitDoc(novoe, novKolvo);
    setMenushka({ show: false, x: 0, y: 0, row: null });
  }

  function udalitStroku(ind) {
    let novoe = {};
    let nomer = ind + 1;
    
    for (let key in inf) {
      let b = key.match(/[A-Z]+/)[0];
      let n = parseInt(key.match(/\d+/)[0]);
      
      if (n === nomer) continue;
      
      if (n > nomer) {
        let novKey = b + (n - 1);
        novoe[novKey] = inf[key];
      } else {
        novoe[key] = inf[key];
      }
    }
    
    let novKolvo = kolvoStrok - 1;
    setInf(novoe);
    setKolvoStrok(novKolvo);
    obnovitDoc(novoe, novKolvo);
    setMenushka({ show: false, x: 0, y: 0, row: null });
  }

  const klikPoYacheyke = (id) => {
    setVibrano(id);
    setRedakt(false);
    
    let vseYacheyki = document.querySelectorAll('.cell');
    for (let i = 0; i < vseYacheyki.length; i++) {
      vseYacheyki[i].style.background = '';
    }
    
    let el = document.getElementById(`cell-${id}`);
    if (el) el.style.background = '#e3f2fd';
    
    if (inputFormula.current) {
      inputFormula.current.value = inf[id]?.raw || '';
    }
  };

  const dvoinoyKlik = (id) => {
    setVibrano(id);
    setRedakt(true);
    setTimeout(() => {
      if (inputYacheyka.current) {
        inputYacheyka.current.focus();
        inputYacheyka.current.value = inf[id]?.raw || '';
      }
    }, 10);
  };

  const nazhalKlavishu = (e, id) => {
    if (e.key === 'Enter') {
      setRedakt(false);
      pomenyatYacheyku(id, e.target.value);
    }
  };

  const pravyKlik = (e, ind) => {
    e.preventDefault();
    setMenushka({
      show: true,
      x: e.clientX,
      y: e.clientY,
      row: ind,
    });
  };

  function sozdatDoc() {
    if (!imyaNovogo.trim()) return;
    
    let pustoi = {};
    let limit = Math.min(skolkoStolbcov, alfavit.length);
    
    for (let i = 0; i < skolkoStrok; i++) {
      for (let j = 0; j < limit; j++) {
        let id = alfavit[j] + (i + 1);
        pustoi[id] = { raw: '', res: '' };
      }
    }
    
    let doc = {
      id: Date.now(),
      name: imyaNovogo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rows: skolkoStrok,
      cols: limit,
      data: pustoi,
    };
    
    let novDocs = [...vseDocs, doc];
    sohranitVseDocs(novDocs);
    setOkno(false);
    setImyaNovogo('');
    setSkolkoStrok(20);
    setSkolkoStolbcov(10);
  }

  function udalitDoc(id) {
    if (!confirm('Точно удалить?')) return;
    
    let novDocs = vseDocs.filter(d => d.id !== id);
    sohranitVseDocs(novDocs);
    
    if (tekDocId === id) {
      if (novDocs.length > 0) {
        setTekDocId(novDocs[0].id);
        setNazvanie(novDocs[0].name);
        setKolvoStrok(novDocs[0].rows);
        setInf(novDocs[0].data);
      } else {
        setPokazatSpisok(true);
        setTekDocId(null);
      }
    }
  }

  function pereimenovatDoc(id) {
    let novoeImya = prompt('Новое название');
    if (novoeImya && novoeImya.trim()) {
      let novDocs = vseDocs.map(d => {
        if (d.id === id) {
          return { ...d, name: novoeImya, updatedAt: new Date().toISOString() };
        }
        return d;
      });
      sohranitVseDocs(novDocs);
      if (tekDocId === id) {
        setNazvanie(novoeImya);
      }
    }
  }

  function skopirovatDoc(id) {
    let original = vseDocs.find(d => d.id === id);
    if (!original) return;
    
    let kopiyaDannye = JSON.parse(JSON.stringify(original.data));
    let novDoc = {
      id: Date.now(),
      name: original.name + ' - копия',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rows: original.rows,
      cols: original.cols,
      data: kopiyaDannye,
    };
    
    sohranitVseDocs([...vseDocs, novDoc]);
  }

  function exportCSV() {
    let csvText = '';
    for (let r = 0; r < kolvoStrok; r++) {
      let stroka = [];
      for (let c = 0; c < alfavit.length; c++) {
        let id = alfavit[c] + (r + 1);
        let val = inf[id]?.res || inf[id]?.raw || '';
        if (val.includes(',') || val.includes('"')) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        stroka.push(val);
      }
      csvText += stroka.join(',') + '\n';
    }
    
    let blob = new Blob([csvText], { type: 'text/csv' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = nazvanie + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    let dlyaSohrana = {
      name: nazvanie,
      rows: kolvoStrok,
      data: inf
    };
    let blob = new Blob([JSON.stringify(dlyaSohrana, null, 2)], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = nazvanie + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importCSV() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      let file = e.target.files[0];
      if (!file) return;
      
      let reader = new FileReader();
      reader.onload = (ev) => {
        let text = ev.target.result;
        let lines = text.split(/\r?\n/);
        let novKolvo = Math.min(lines.length, 200);
        let novInf = {};
        
        for (let r = 0; r < novKolvo; r++) {
          let stolbcy = lines[r].split(',');
          for (let c = 0; c < stolbcy.length && c < alfavit.length; c++) {
            let id = alfavit[c] + (r + 1);
            let rawVal = stolbcy[c].replace(/^"|"$/g, '');
            novInf[id] = { raw: rawVal, res: rawVal };
          }
        }
        
        setInf(novInf);
        setKolvoStrok(novKolvo);
        obnovitDoc(novInf, novKolvo);
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  }

  function prinuditelnoSohranit() {
    if (tekDocId) {
      obnovitDoc(inf);
      setStatusSave('Сохранено');
      if (timerSave.current) clearTimeout(timerSave.current);
    }
  }

  useEffect(() => {
    function naKlave(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        prinuditelnoSohranit();
      }
    }
    window.addEventListener('keydown', naKlave);
    return () => window.removeEventListener('keydown', naKlave);
  }, [tekDocId, inf]);

  useEffect(() => {
    function warning(e) {
      if (statusSave === 'Сохранение...') {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', warning);
    return () => window.removeEventListener('beforeunload', warning);
  }, [statusSave]);

  function pokazatPreview(dataDoc, rowsDoc) {
    let prev = [];
    for (let r = 0; r < Math.min(3, rowsDoc); r++) {
      let str = [];
      for (let c = 0; c < Math.min(3, alfavit.length); c++) {
        let id = alfavit[c] + (r + 1);
        let val = dataDoc[id]?.res || dataDoc[id]?.raw || '';
        if (val.length > 10) val = val.slice(0, 10);
        str.push(val || '—');
      }
      prev.push(str);
    }
    return prev;
  }

  if (pokazatSpisok) {
    return (
      <div style={{ padding: 30 }}>
        <h1>Мои документы</h1>
        <button onClick={() => setOkno(true)} style={{ marginBottom: 20, padding: '8px 16px' }}>
          Новый документ
        </button>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {vseDocs.map(doc => {
            let preview = pokazatPreview(doc.data, doc.rows);
            return (
              <div key={doc.id} style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8, cursor: 'pointer' }} onClick={() => {
                setTekDocId(doc.id);
                setNazvanie(doc.name);
                setKolvoStrok(doc.rows);
                setInf(doc.data);
                setPokazatSpisok(false);
              }}>
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
                  <button onClick={(e) => { e.stopPropagation(); pereimenovatDoc(doc.id); }}>Переименовать</button>
                  <button onClick={(e) => { e.stopPropagation(); skopirovatDoc(doc.id); }}>Дублировать</button>
                  <button onClick={(e) => { e.stopPropagation(); udalitDoc(doc.id); }}>Удалить</button>
                </div>
              </div>
            );
          })}
        </div>
        
        {okno && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setOkno(false)}>
            <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 300 }} onClick={(e) => e.stopPropagation()}>
              <h3>Новый документ</h3>
              <input placeholder="Название" value={imyaNovogo} onChange={(e) => setImyaNovogo(e.target.value)} style={{ width: '100%', margin: '10px 0', padding: 8 }} />
              <input type="number" placeholder="Строки" value={skolkoStrok} onChange={(e) => setSkolkoStrok(parseInt(e.target.value) || 1)} style={{ width: '100%', margin: '10px 0', padding: 8 }} />
              <input type="number" placeholder="Столбцы (max 26)" value={skolkoStolbcov} onChange={(e) => setSkolkoStolbcov(Math.min(parseInt(e.target.value) || 1, 26))} style={{ width: '100%', margin: '10px 0', padding: 8 }} />
              <button onClick={sozdatDoc}>Создать</button>
              <button onClick={() => setOkno(false)}>Отмена</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container" onClick={() => setMenushka({ show: false, x: 0, y: 0, row: null })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <div>
          <button onClick={() => setPokazatSpisok(true)} style={{ marginRight: 12 }}>К списку</button>
          <strong>{nazvanie}</strong>
          <span style={{ marginLeft: 12, fontSize: 12, color: statusSave === 'Сохранено' ? 'green' : 'orange' }}>{statusSave}</span>
        </div>
        <div>
          <button onClick={exportCSV}>CSV</button>
          <button onClick={exportJSON}>JSON</button>
          <button onClick={importCSV}>Импорт CSV</button>
          <button onClick={prinuditelnoSohranit}>Сохранить (Ctrl+S)</button>
        </div>
      </div>
      
      <div className="formula-bar">
        <div className="cell-ref">{vibrano}</div>
        <input
          ref={inputFormula}
          className="formula-input"
          onChange={(e) => pomenyatYacheyku(vibrano, e.target.value)}
        />
      </div>

      <div className="table-wrapper">
         <table>
          <thead>
            <tr>
              <th className="corner">#</th>
              {alfavit.map(bukva => (
                <th key={bukva}>{bukva}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: kolvoStrok }).map((_, idx) => (
              <tr key={idx}>
                <th
                  className="row-header"
                  onContextMenu={(e) => pravyKlik(e, idx)}
                >
                  {idx + 1}
                </th>
                {alfavit.map((bukva, idxKol) => {
                  const id = bukva + (idx + 1);
                  const redaktiruetsya = redakt && vibrano === id;
                  const yacheyka = inf[id] || { raw: '', res: '' };
                  
                  return (
                    <td
                      key={id}
                      id={`cell-${id}`}
                      className="cell"
                      onClick={() => klikPoYacheyke(id)}
                      onDoubleClick={() => dvoinoyKlik(id)}
                    >
                      {redaktiruetsya ? (
                        <input
                          ref={inputYacheyka}
                          className="cell-editor"
                          defaultValue={yacheyka.raw}
                          onBlur={() => setRedakt(false)}
                          onKeyDown={(e) => nazhalKlavishu(e, id)}
                        />
                      ) : (
                        <div className="cell-content">
                          {yacheyka.res || yacheyka.raw || ''}
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

      {menushka.show && menushka.row !== null && (
        <div className="context-menu" style={{ top: menushka.y, left: menushka.x }}>
          <div onClick={() => dobavitStroku(menushka.row)}>Добавить строку ниже</div>
          <div onClick={() => udalitStroku(menushka.row)}>Удалить строку</div>
          <hr />
          <div onClick={() => setMenushka({ show: false, x: 0, y: 0, row: null })}>
            Отмена
          </div>
        </div>
      )}
    </div>
  );
}

export default App;