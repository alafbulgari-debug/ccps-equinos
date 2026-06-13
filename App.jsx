import { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope, Wheat, Droplet, MessageSquare, PackagePlus, Boxes, BarChart3,
  Settings, LogOut, Trash2, Loader2, AlertTriangle, Lock, User as UserIcon, Plus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { supabase } from './supabaseClient';

/* ---------------------------------- helpers ---------------------------------- */

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDate = (s) => {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};
const fmtMoney = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const PRODUTO_CATEGORIAS = [
  { id: 'Medicamento', color: '#B8542B' },
  { id: 'Insumo', color: '#3F5C44' },
  { id: 'Ração', color: '#C99A3B' },
];
const catColor = (cat) => (PRODUTO_CATEGORIAS.find((c) => c.id === cat) || PRODUTO_CATEGORIAS[1]).color;

const FUNCOES_ANIMAL = ['Garanhão', 'Manequim', 'Égua receptora', 'Outro'];

function nomeOf(list, id) {
  const it = list.find((x) => x.id === id);
  return it ? it.nome : '—';
}

function estoqueAtualDe(produtoId, produtos, entradas, clinica, trato) {
  const p = produtos.find((x) => x.id === produtoId);
  if (!p) return 0;
  const totalEntradas = entradas.filter((e) => e.produto_id === produtoId).reduce((s, e) => s + Number(e.quantidade), 0);
  const totalClinica = clinica.filter((c) => c.medicamento_id === produtoId).reduce((s, c) => s + Number(c.quantidade_ml), 0);
  const totalTrato = trato.filter((t) => t.produto_id === produtoId).reduce((s, t) => s + Number(t.quantidade || 0), 0);
  return (Number(p.estoque_inicial) || 0) + totalEntradas - totalClinica - totalTrato;
}

function statusOf(atual, minimo) {
  if (!minimo || minimo <= 0) return 'ok';
  const ratio = atual / minimo;
  if (ratio <= 1) return 'baixo';
  if (ratio <= 1.5) return 'atencao';
  return 'ok';
}

function inPeriod(dataStr, periodo) {
  if (periodo === 'tudo') return true;
  if (!dataStr) return false;
  const now = new Date();
  const d = new Date(dataStr + 'T00:00:00');
  if (periodo === 'hoje') return dataStr === todayStr();
  if (periodo === 'semana') {
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    return diff >= -1 && diff < 7;
  }
  if (periodo === 'mes') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  return true;
}

/* ------------------------------------ CSS ------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.app {
  --bg: #F4EFE3;
  --surface: #FFFEFB;
  --surface-2: #ECE4D2;
  --ink: #262E22;
  --ink-soft: #6E7560;
  --primary: #3F5C44;
  --primary-dark: #2C4030;
  --accent: #B8542B;
  --accent-soft: #EFD9C8;
  --grain: #C99A3B;
  --good: #4F7A57;
  --line: #D9D0BB;
  --danger: #B23A2E;
  --amber: #C08A2E;

  font-family: 'IBM Plex Sans', sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
}
.app * { box-sizing: border-box; }

/* login */
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.login-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 2rem 1.85rem; max-width: 380px; width: 100%; }
.login-card h1 { font-family: 'Fraunces', serif; font-size: 1.5rem; color: var(--primary-dark); margin: 0.5rem 0 0.1rem; }
.login-card .sub { color: var(--ink-soft); font-size: 0.85rem; margin: 0 0 1.5rem; }
.login-icon { width: 42px; height: 42px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: #fff; }
.login-hint { font-size: 0.72rem; color: var(--ink-soft); margin-top: 1.25rem; border-top: 1px dashed var(--line); padding-top: 0.85rem; line-height: 1.5; }
.login-error { background: var(--accent-soft); color: var(--accent); border-radius: 5px; padding: 0.5rem 0.7rem; font-size: 0.82rem; margin-bottom: 0.9rem; }

/* shell */
.shell { max-width: 1040px; margin: 0 auto; padding: 1.1rem 1rem 3rem; }
.header { padding: 0.4rem 0 1rem; border-bottom: 1px solid var(--line); margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
.header h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 1.7rem; letter-spacing: -0.01em; margin: 0; color: var(--primary-dark); }
.header p { margin: 0.2rem 0 0; color: var(--ink-soft); font-size: 0.85rem; }
.user-bar { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; }
.role-pill { font-size: 0.65rem; padding: 0.18rem 0.5rem; border-radius: 4px; background: var(--surface-2); color: var(--ink-soft); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; border: 1px solid var(--line); }
.logout-btn { background: none; border: 1px solid var(--line); border-radius: 5px; padding: 0.3rem 0.5rem; color: var(--ink-soft); cursor: pointer; display: flex; align-items: center; }
.logout-btn:hover { color: var(--danger); border-color: var(--danger); }

/* tabs */
.tabs { display: flex; gap: 0.35rem; overflow-x: auto; margin-bottom: 1.1rem; padding-bottom: 2px; }
.tab {
  font-family: 'IBM Plex Sans', sans-serif; font-size: 0.83rem; font-weight: 500; display: flex; align-items: center; gap: 0.4rem;
  white-space: nowrap; padding: 0.55rem 0.95rem; border: 1px solid var(--line); border-bottom: none; border-radius: 8px 8px 0 0;
  background: var(--surface-2); color: var(--ink-soft); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.tab:hover { background: var(--surface); color: var(--ink); }
.tab.active { background: var(--surface); color: var(--primary-dark); border-bottom: 1px solid var(--surface); margin-bottom: -1px; font-weight: 600; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 0 8px 8px 8px; padding: 1.25rem; }

.subtabs { display: flex; gap: 0.4rem; margin-bottom: 1.1rem; flex-wrap: wrap; }
.subtab { font-size: 0.8rem; font-weight: 600; padding: 0.4rem 0.85rem; border-radius: 999px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink-soft); cursor: pointer; }
.subtab.active { background: var(--primary); color: #fff; border-color: var(--primary); }

/* forms */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field label { font-size: 0.76rem; font-weight: 600; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
.field input, .field select, .field textarea {
  font-family: 'IBM Plex Sans', sans-serif; font-size: 0.92rem; padding: 0.55rem 0.65rem; border: 1px solid var(--line);
  border-radius: 5px; background: var(--surface); color: var(--ink);
}
.field input:focus, .field select:focus, .field textarea:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
.field textarea { resize: vertical; min-height: 56px; }
.field .hint { font-size: 0.75rem; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; }

.btn {
  font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; font-size: 0.9rem; padding: 0.65rem 1.2rem; border-radius: 6px;
  border: 1px solid var(--primary); background: var(--primary); color: #fff; cursor: pointer; transition: background 0.15s;
  display: inline-flex; align-items: center; gap: 0.4rem;
}
.btn:hover { background: var(--primary-dark); }
.btn.secondary { background: transparent; color: var(--primary-dark); border-color: var(--line); }
.btn.secondary:hover { background: var(--surface-2); }
.btn.danger { background: transparent; color: var(--danger); border-color: var(--danger); }
.btn.danger:hover { background: var(--danger); color: #fff; }
.btn.full { width: 100%; justify-content: center; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.preview { margin-top: 1rem; padding: 0.8rem 1rem; border-radius: 6px; border: 1px dashed var(--line); font-size: 0.85rem; color: var(--ink-soft); }
.preview b { color: var(--ink); font-family: 'IBM Plex Mono', monospace; }
.preview.warn { border-color: var(--danger); color: var(--danger); }

.section-title { font-family: 'Fraunces', serif; font-size: 1.05rem; font-weight: 600; color: var(--primary-dark); margin: 0 0 0.75rem; }
.divider { border: none; border-top: 1px solid var(--line); margin: 1.5rem 0; }

/* tables */
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 0.83rem; min-width: 620px; }
th, td { padding: 0.5rem 0.65rem; text-align: left; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { background: var(--surface-2); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); }
td.num { font-family: 'IBM Plex Mono', monospace; }
tr:last-child td { border-bottom: none; }

/* cards / grid */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.9rem; }
.card { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: 4px; padding: 1.1rem 1rem 0.9rem; border-left: 5px solid var(--cat-color); }
.card-cat { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; color: var(--cat-color); }
.card-name { font-family: 'Fraunces', serif; font-size: 1.02rem; font-weight: 600; margin: 0.1rem 0 0.5rem; line-height: 1.25; }
.card-qty { font-family: 'IBM Plex Mono', monospace; font-size: 1.35rem; font-weight: 500; }
.card-unit { font-size: 0.78rem; color: var(--ink-soft); margin-left: 0.2rem; }
.card-min { font-size: 0.74rem; color: var(--ink-soft); margin-top: 0.15rem; }
.gauge { height: 7px; border-radius: 4px; background: var(--surface-2); margin-top: 0.6rem; overflow: hidden; border: 1px solid var(--line); }
.gauge-fill { height: 100%; border-radius: 4px; }
.gauge-fill.ok { background: var(--good); }
.gauge-fill.atencao { background: var(--amber); }
.gauge-fill.baixo { background: var(--danger); }
.stamp { position: absolute; top: 0.7rem; right: 0.7rem; font-family: 'IBM Plex Mono', monospace; font-size: 0.6rem; font-weight: 600; letter-spacing: 0.05em; color: var(--danger); border: 1.5px solid var(--danger); border-radius: 3px; padding: 0.15rem 0.4rem; transform: rotate(-6deg); text-transform: uppercase; }
.cat-filter { display: flex; gap: 0.4rem; margin-bottom: 1rem; flex-wrap: wrap; }

/* lists */
.items-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
.item-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.6rem 0.8rem; border: 1px solid var(--line); border-radius: 6px; background: var(--surface-2); flex-wrap: wrap; }
.item-row .meta { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.item-row .name { font-weight: 600; }
.badge { font-size: 0.65rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; padding: 0.1rem 0.45rem; border-radius: 3px; color: #fff; background: var(--ink-soft); }

/* dashboard */
.dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 0.7rem; margin-bottom: 1.25rem; }
.dash-chip { border: 1px solid var(--line); border-radius: 6px; padding: 0.7rem 0.9rem; background: var(--surface-2); }
.dash-chip .num { font-family: 'IBM Plex Mono', monospace; font-size: 1.4rem; font-weight: 500; color: var(--primary-dark); display: block; }
.dash-chip .lbl { font-size: 0.74rem; color: var(--ink-soft); }
.chart-card { border: 1px solid var(--line); border-radius: 6px; padding: 0.9rem; margin-bottom: 1.25rem; background: var(--surface-2); }
.chart-card h4 { font-family: 'Fraunces', serif; margin: 0 0 0.6rem; font-size: 1rem; color: var(--primary-dark); }
.period-bar { display: flex; gap: 0.4rem; margin-bottom: 1.1rem; flex-wrap: wrap; }

.empty { text-align: center; padding: 2.5rem 1rem; color: var(--ink-soft); }
.empty h3 { font-family: 'Fraunces', serif; color: var(--primary-dark); margin: 0.5rem 0 0.25rem; font-size: 1.15rem; }
.loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 3rem 0; color: var(--ink-soft); min-height: 60vh; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.footer-note { font-size: 0.73rem; color: var(--ink-soft); text-align: center; margin-top: 1.5rem; }
`;

/* -------------------------------- generic table -------------------------------- */

function DataTable({ columns, rows, emptyMsg }) {
  if (!rows.length) return <div className="empty"><p>{emptyMsg}</p></div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id || idx}>
              {columns.map((c) => <td key={c.key} className={c.num ? 'num' : ''}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------- LOGIN ----------------------------------- */

function LoginScreen({ users, onLogin }) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  function submit(e) {
    e.preventDefault();
    const u = users.find((x) => x.login.toLowerCase() === login.trim().toLowerCase() && x.senha === senha);
    if (!u) {
      setErro('Usuário ou senha incorretos.');
      return;
    }
    onLogin(u);
  }

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon"><Lock size={20} /></div>
          <h1>CCPS Equinos</h1>
          <p className="sub">Seleon Biotecnologia Animal — acesso ao sistema</p>
          {erro && <div className="login-error">{erro}</div>}
          <form onSubmit={submit}>
            <div className="field" style={{ marginBottom: '0.8rem' }}>
              <label>Usuário</label>
              <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="seu.login" autoFocus />
            </div>
            <div className="field" style={{ marginBottom: '1.1rem' }}>
              <label>Senha</label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="btn full" type="submit"><UserIcon size={16} /> Entrar</button>
          </form>
          <div className="login-hint">
            Primeiro acesso? Usuários padrão: <br />
            admin / admin123 (acesso total) <br />
            operador / operador123 (lançamentos e leitura) <br />
            Recomendamos trocar essas senhas em Cadastro → Usuários.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- CLÍNICA ----------------------------------- */

function ClinicaTab({ animais, produtos, entradas, clinica, trato, currentUser, onAdd }) {
  const medicamentos = produtos.filter((p) => p.categoria === 'Medicamento');
  const [data, setData] = useState(todayStr());
  const [animalId, setAnimalId] = useState(animais[0]?.id || '');
  const [tipoTratamento, setTipoTratamento] = useState('');
  const [medicamentoId, setMedicamentoId] = useState(medicamentos[0]?.id || '');
  const [quantidadeMl, setQuantidadeMl] = useState('');
  const [observacao, setObservacao] = useState('');
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!animalId && animais[0]) setAnimalId(animais[0].id); }, [animais, animalId]);
  useEffect(() => { if (!medicamentoId && medicamentos[0]) setMedicamentoId(medicamentos[0].id); }, [medicamentos, medicamentoId]);

  if (animais.length === 0) {
    return <div className="empty"><Stethoscope size={32} style={{ color: 'var(--primary)' }} /><h3>Cadastre animais primeiro</h3><p>Peça a um administrador para cadastrar os cavalos em Cadastro → Animais.</p></div>;
  }

  const estoqueAtual = medicamentoId ? estoqueAtualDe(medicamentoId, produtos, entradas, clinica, trato) : 0;
  const qtyNum = parseFloat(quantidadeMl);
  const valido = animalId && data && tipoTratamento.trim() && medicamentoId && !isNaN(qtyNum) && qtyNum > 0;
  const ficaNegativo = medicamentoId && !isNaN(qtyNum) && (estoqueAtual - qtyNum) < 0;
  const medUnidade = produtos.find((p) => p.id === medicamentoId)?.unidade || 'ml';

  async function submit(e) {
    e.preventDefault();
    if (!valido || saving) return;
    setSaving(true);
    await onAdd({ data, animal_id: animalId, tipo_tratamento: tipoTratamento.trim(), medicamento_id: medicamentoId, quantidade_ml: qtyNum, observacao: observacao.trim(), responsavel: currentUser.nome });
    setSaving(false);
    setTipoTratamento(''); setQuantidadeMl(''); setObservacao('');
    setMsg('Atendimento registrado.');
    setTimeout(() => setMsg(null), 2500);
  }

  const rows = [...clinica].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div className="section-title">Registrar atendimento</div>
      {medicamentos.length === 0 && <div className="preview warn"><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> Nenhum medicamento cadastrado em Cadastro → Produtos.</div>}
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field"><label>Data</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field">
            <label>Cavalo</label>
            <select value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
              {animais.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Tipo de tratamento</label>
            <input list="tipos-tratamento" value={tipoTratamento} onChange={(e) => setTipoTratamento(e.target.value)} placeholder="Ex: Vacina, Antibiótico, Vermífugo..." />
            <datalist id="tipos-tratamento">
              <option value="Vacina" /><option value="Antibiótico" /><option value="Anti-inflamatório" /><option value="Vermífugo" /><option value="Antiparasitário (tristeza)" /><option value="Vitamínico" /><option value="Curativo" />
            </datalist>
          </div>
          <div className="field">
            <label>Medicamento</label>
            <select value={medicamentoId} onChange={(e) => setMedicamentoId(e.target.value)}>
              {medicamentos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            {medicamentoId && <span className="hint">estoque atual: {estoqueAtual} {medUnidade}</span>}
          </div>
          <div className="field">
            <label>Quantidade (ml)</label>
            <input type="number" min="0" step="any" value={quantidadeMl} onChange={(e) => setQuantidadeMl(e.target.value)} placeholder="0" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Observação</label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Detalhes do atendimento..." />
          </div>
        </div>
        {ficaNegativo && (
          <div className="preview warn"><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> Estoque insuficiente: ficaria em <b>{(estoqueAtual - qtyNum).toFixed(2)} {medUnidade}</b>. Verifique a reposição.</div>
        )}
        <div style={{ marginTop: '1.1rem' }}>
          <button className="btn" type="submit" disabled={!valido || saving}><Plus size={16} /> {saving ? 'Salvando...' : 'Registrar atendimento'}</button>
          {msg && <span style={{ marginLeft: '0.75rem', color: 'var(--good)', fontSize: '0.85rem', fontWeight: 600 }}>{msg}</span>}
        </div>
      </form>

      <hr className="divider" />
      <div className="section-title">Histórico de atendimentos</div>
      <DataTable
        emptyMsg="Nenhum atendimento registrado ainda."
        rows={rows}
        columns={[
          { key: 'data', label: 'Data', render: (r) => fmtDate(r.data) },
          { key: 'cavalo', label: 'Cavalo', render: (r) => nomeOf(animais, r.animal_id) },
          { key: 'tipo_tratamento', label: 'Tratamento' },
          { key: 'medicamento', label: 'Medicamento', render: (r) => nomeOf(produtos, r.medicamento_id) },
          { key: 'quantidade_ml', label: 'Qtd (ml)', num: true },
          { key: 'responsavel', label: 'Registrado por' },
          { key: 'observacao', label: 'Observação' },
        ]}
      />
    </div>
  );
}

/* ------------------------------------ TRATO ------------------------------------ */

function TratoTab({ animais, produtos, entradas, clinica, trato, currentUser, onAdd }) {
  const insumos = produtos.filter((p) => p.categoria === 'Insumo' || p.categoria === 'Ração');
  const [data, setData] = useState(todayStr());
  const [hora, setHora] = useState(nowStr());
  const [animalId, setAnimalId] = useState(animais[0]?.id || '');
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [pessoa, setPessoa] = useState(currentUser.nome);
  const [observacao, setObservacao] = useState('');
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!animalId && animais[0]) setAnimalId(animais[0].id); }, [animais, animalId]);

  if (animais.length === 0) {
    return <div className="empty"><Wheat size={32} style={{ color: 'var(--primary)' }} /><h3>Cadastre animais primeiro</h3><p>Peça a um administrador para cadastrar os cavalos em Cadastro → Animais.</p></div>;
  }

  const produto = produtos.find((p) => p.id === produtoId);
  const estoqueAtual = produtoId ? estoqueAtualDe(produtoId, produtos, entradas, clinica, trato) : 0;
  const qtyNum = parseFloat(quantidade);
  const ficaNegativo = produtoId && !isNaN(qtyNum) && qtyNum > 0 && (estoqueAtual - qtyNum) < 0;
  const valido = animalId && data && hora && pessoa.trim() !== '';

  async function submit(e) {
    e.preventDefault();
    if (!valido || saving) return;
    setSaving(true);
    await onAdd({
      data, hora, animal_id: animalId,
      produto_id: produtoId || null,
      quantidade: produtoId && !isNaN(qtyNum) ? qtyNum : 0,
      pessoa: pessoa.trim(), observacao: observacao.trim(),
    });
    setSaving(false);
    setQuantidade(''); setObservacao('');
    setMsg('Trato registrado.');
    setTimeout(() => setMsg(null), 2500);
  }

  const rows = [...trato].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div className="section-title">Registrar trato</div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field"><label>Data</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field"><label>Horário</label><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></div>
          <div className="field">
            <label>Cavalo</label>
            <select value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
              {animais.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Insumo / Ração (opcional)</label>
            <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
              <option value="">— Nenhum —</option>
              {insumos.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.categoria})</option>)}
            </select>
            {produto && <span className="hint">estoque atual: {estoqueAtual} {produto.unidade}</span>}
          </div>
          {produtoId && (
            <div className="field">
              <label>Quantidade ({produto?.unidade})</label>
              <input type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" />
            </div>
          )}
          <div className="field">
            <label>Pessoa</label>
            <input value={pessoa} onChange={(e) => setPessoa(e.target.value)} placeholder="Quem está aplicando o trato" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Observações</label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Detalhes do trato..." />
          </div>
        </div>
        {ficaNegativo && (
          <div className="preview warn"><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> Estoque insuficiente: ficaria em <b>{(estoqueAtual - qtyNum).toFixed(2)} {produto?.unidade}</b>.</div>
        )}
        <div style={{ marginTop: '1.1rem' }}>
          <button className="btn" type="submit" disabled={!valido || saving}><Plus size={16} /> {saving ? 'Salvando...' : 'Registrar trato'}</button>
          {msg && <span style={{ marginLeft: '0.75rem', color: 'var(--good)', fontSize: '0.85rem', fontWeight: 600 }}>{msg}</span>}
        </div>
      </form>

      <hr className="divider" />
      <div className="section-title">Histórico de tratos</div>
      <DataTable
        emptyMsg="Nenhum trato registrado ainda."
        rows={rows}
        columns={[
          { key: 'data', label: 'Data', render: (r) => fmtDate(r.data) },
          { key: 'hora', label: 'Hora', num: true },
          { key: 'cavalo', label: 'Cavalo', render: (r) => nomeOf(animais, r.animal_id) },
          { key: 'insumo', label: 'Insumo/Ração', render: (r) => (r.produto_id ? nomeOf(produtos, r.produto_id) : '—') },
          { key: 'quantidade', label: 'Qtd', num: true, render: (r) => (r.produto_id ? r.quantidade : '—') },
          { key: 'pessoa', label: 'Pessoa' },
          { key: 'observacao', label: 'Observações' },
        ]}
      />
    </div>
  );
}

/* ------------------------------------ COLETA ------------------------------------ */

function ColetaTab({ animais, currentUser, coleta, onAdd }) {
  const [data, setData] = useState(todayStr());
  const [animalId, setAnimalId] = useState(animais[0]?.id || '');
  const [doses, setDoses] = useState('');
  const [manequimId, setManequimId] = useState('');
  const [coletador, setColetador] = useState(currentUser.nome);
  const [observacao, setObservacao] = useState('');
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!animalId && animais[0]) setAnimalId(animais[0].id); }, [animais, animalId]);

  if (animais.length === 0) {
    return <div className="empty"><Droplet size={32} style={{ color: 'var(--primary)' }} /><h3>Cadastre animais primeiro</h3><p>Peça a um administrador para cadastrar os cavalos em Cadastro → Animais.</p></div>;
  }

  const dosesNum = parseFloat(doses);
  const valido = animalId && data && !isNaN(dosesNum) && dosesNum >= 0 && coletador.trim() !== '';

  async function submit(e) {
    e.preventDefault();
    if (!valido || saving) return;
    setSaving(true);
    await onAdd({ data, animal_id: animalId, doses: dosesNum, manequim_id: manequimId || null, coletador: coletador.trim(), observacao: observacao.trim() });
    setSaving(false);
    setDoses(''); setObservacao('');
    setMsg('Coleta registrada.');
    setTimeout(() => setMsg(null), 2500);
  }

  const rows = [...coleta].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div className="section-title">Registrar coleta</div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field"><label>Data da coleta</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field">
            <label>Cavalo (garanhão)</label>
            <select value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
              {animais.map((a) => <option key={a.id} value={a.id}>{a.nome}{a.funcao ? ` (${a.funcao})` : ''}</option>)}
            </select>
          </div>
          <div className="field"><label>Quantidade de doses</label><input type="number" min="0" step="any" value={doses} onChange={(e) => setDoses(e.target.value)} placeholder="0" /></div>
          <div className="field">
            <label>Manequim</label>
            <select value={manequimId} onChange={(e) => setManequimId(e.target.value)}>
              <option value="">— Não informado —</option>
              {animais.map((a) => <option key={a.id} value={a.id}>{a.nome}{a.funcao ? ` (${a.funcao})` : ''}</option>)}
            </select>
          </div>
          <div className="field"><label>Coletador</label><input value={coletador} onChange={(e) => setColetador(e.target.value)} placeholder="Responsável pela coleta" /></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Observações</label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Qualidade do material, comportamento, etc." />
          </div>
        </div>
        <div style={{ marginTop: '1.1rem' }}>
          <button className="btn" type="submit" disabled={!valido || saving}><Plus size={16} /> {saving ? 'Salvando...' : 'Registrar coleta'}</button>
          {msg && <span style={{ marginLeft: '0.75rem', color: 'var(--good)', fontSize: '0.85rem', fontWeight: 600 }}>{msg}</span>}
        </div>
      </form>

      <hr className="divider" />
      <div className="section-title">Histórico de coletas</div>
      <DataTable
        emptyMsg="Nenhuma coleta registrada ainda."
        rows={rows}
        columns={[
          { key: 'data', label: 'Data', render: (r) => fmtDate(r.data) },
          { key: 'cavalo', label: 'Garanhão', render: (r) => nomeOf(animais, r.animal_id) },
          { key: 'doses', label: 'Doses', num: true },
          { key: 'manequim', label: 'Manequim', render: (r) => (r.manequim_id ? nomeOf(animais, r.manequim_id) : '—') },
          { key: 'coletador', label: 'Coletador' },
          { key: 'observacao', label: 'Observações' },
        ]}
      />
    </div>
  );
}

/* --------------------------------- OBSERVAÇÕES --------------------------------- */

function ObservacoesTab({ animais, currentUser, observacoes, onAdd }) {
  const [data, setData] = useState(todayStr());
  const [animalId, setAnimalId] = useState(animais[0]?.id || '');
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!animalId && animais[0]) setAnimalId(animais[0].id); }, [animais, animalId]);

  if (animais.length === 0) {
    return <div className="empty"><MessageSquare size={32} style={{ color: 'var(--primary)' }} /><h3>Cadastre animais primeiro</h3><p>Peça a um administrador para cadastrar os cavalos em Cadastro → Animais.</p></div>;
  }

  const valido = animalId && data && texto.trim() !== '';

  async function submit(e) {
    e.preventDefault();
    if (!valido || saving) return;
    setSaving(true);
    await onAdd({ data, animal_id: animalId, texto: texto.trim(), responsavel: currentUser.nome });
    setSaving(false);
    setTexto('');
    setMsg('Observação registrada.');
    setTimeout(() => setMsg(null), 2500);
  }

  const rows = [...observacoes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div className="section-title">Registrar observação</div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field"><label>Data</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field">
            <label>Cavalo</label>
            <select value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
              {animais.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Observação</label>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Comportamento, libido, ferimentos, condição corporal, etc." />
          </div>
        </div>
        <div style={{ marginTop: '1.1rem' }}>
          <button className="btn" type="submit" disabled={!valido || saving}><Plus size={16} /> {saving ? 'Salvando...' : 'Registrar observação'}</button>
          {msg && <span style={{ marginLeft: '0.75rem', color: 'var(--good)', fontSize: '0.85rem', fontWeight: 600 }}>{msg}</span>}
        </div>
      </form>

      <hr className="divider" />
      <div className="section-title">Histórico de observações</div>
      <DataTable
        emptyMsg="Nenhuma observação registrada ainda."
        rows={rows}
        columns={[
          { key: 'data', label: 'Data', render: (r) => fmtDate(r.data) },
          { key: 'cavalo', label: 'Cavalo', render: (r) => nomeOf(animais, r.animal_id) },
          { key: 'texto', label: 'Observação' },
          { key: 'responsavel', label: 'Registrado por' },
        ]}
      />
    </div>
  );
}

/* ------------------------------- ENTRADA DE PRODUTO ------------------------------- */

function EntradaTab({ produtos, entradas, clinica, trato, currentUser, onAdd }) {
  const [produtoId, setProdutoId] = useState(produtos[0]?.id || '');
  const [quantidade, setQuantidade] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [responsavel, setResponsavel] = useState(currentUser.nome);
  const [data, setData] = useState(todayStr());
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!produtoId && produtos[0]) setProdutoId(produtos[0].id); }, [produtos, produtoId]);

  if (produtos.length === 0) {
    return <div className="empty"><PackagePlus size={32} style={{ color: 'var(--primary)' }} /><h3>Cadastre produtos primeiro</h3><p>Peça a um administrador para cadastrar os produtos em Cadastro → Produtos.</p></div>;
  }

  const produto = produtos.find((p) => p.id === produtoId);
  const estoqueAtual = produtoId ? estoqueAtualDe(produtoId, produtos, entradas, clinica, trato) : 0;
  const qtyNum = parseFloat(quantidade);
  const valorNum = parseFloat(valorUnitario) || 0;
  const valido = produtoId && !isNaN(qtyNum) && qtyNum > 0 && responsavel.trim() !== '' && data;

  async function submit(e) {
    e.preventDefault();
    if (!valido || saving) return;
    setSaving(true);
    await onAdd({ produto_id: produtoId, quantidade: qtyNum, valor_unitario: valorNum, responsavel: responsavel.trim(), data });
    setSaving(false);
    setQuantidade(''); setValorUnitario('');
    setMsg('Entrada registrada.');
    setTimeout(() => setMsg(null), 2500);
  }

  const rows = [...entradas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div className="section-title">Cadastro de produto recebido (entrada de estoque)</div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>Produto</label>
            <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {produto && <span className="hint">cód. {produto.codigo || '—'} · {produto.categoria} · estoque atual: {estoqueAtual} {produto.unidade}</span>}
          </div>
          <div className="field"><label>Quantidade de entrada {produto ? `(${produto.unidade})` : ''}</label><input type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" /></div>
          <div className="field"><label>Valor unitário (R$)</label><input type="number" min="0" step="0.01" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} placeholder="0,00" /></div>
          <div className="field"><label>Data de entrada</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field"><label>Responsável pelo recebimento</label><input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome" /></div>
        </div>
        {!isNaN(qtyNum) && qtyNum > 0 && (
          <div className="preview">Valor total: <b>{fmtMoney(valorNum * qtyNum)}</b> · saldo após entrada: <b>{(estoqueAtual + qtyNum)} {produto?.unidade}</b></div>
        )}
        <div style={{ marginTop: '1.1rem' }}>
          <button className="btn" type="submit" disabled={!valido || saving}><Plus size={16} /> {saving ? 'Salvando...' : 'Registrar entrada'}</button>
          {msg && <span style={{ marginLeft: '0.75rem', color: 'var(--good)', fontSize: '0.85rem', fontWeight: 600 }}>{msg}</span>}
        </div>
      </form>

      <hr className="divider" />
      <div className="section-title">Histórico de entradas</div>
      <DataTable
        emptyMsg="Nenhuma entrada registrada ainda."
        rows={rows}
        columns={[
          { key: 'data', label: 'Data', render: (r) => fmtDate(r.data) },
          { key: 'produto', label: 'Produto', render: (r) => nomeOf(produtos, r.produto_id) },
          { key: 'quantidade', label: 'Qtd', num: true },
          { key: 'valor_unitario', label: 'Valor unit.', num: true, render: (r) => fmtMoney(r.valor_unitario) },
          { key: 'total', label: 'Total', num: true, render: (r) => fmtMoney(r.valor_unitario * r.quantidade) },
          { key: 'responsavel', label: 'Recebido por' },
        ]}
      />
    </div>
  );
}

/* ------------------------------------ ESTOQUE ------------------------------------ */

function EstoqueTab({ produtos, entradas, clinica, trato }) {
  const [filtro, setFiltro] = useState('Todos');
  if (produtos.length === 0) {
    return <div className="empty"><Boxes size={32} style={{ color: 'var(--primary)' }} /><h3>Nenhum produto cadastrado</h3><p>Peça a um administrador para cadastrar os produtos em Cadastro → Produtos.</p></div>;
  }
  const categorias = ['Todos', ...PRODUTO_CATEGORIAS.map((c) => c.id)];
  const lista = produtos
    .map((p) => ({ ...p, atual: estoqueAtualDe(p.id, produtos, entradas, clinica, trato) }))
    .filter((p) => filtro === 'Todos' || p.categoria === filtro);
  const baixos = lista.filter((p) => statusOf(p.atual, p.estoque_minimo) === 'baixo').length;

  return (
    <div>
      <div className="cat-filter">
        {categorias.map((c) => (
          <button key={c} className={`subtab ${filtro === c ? 'active' : ''}`} onClick={() => setFiltro(c)} type="button">{c}</button>
        ))}
      </div>
      <div className="dash-grid">
        <div className="dash-chip"><span className="num">{lista.length}</span><span className="lbl">produtos</span></div>
        <div className="dash-chip" style={baixos > 0 ? { borderColor: 'var(--danger)' } : {}}>
          <span className="num" style={baixos > 0 ? { color: 'var(--danger)' } : {}}>{baixos}</span>
          <span className="lbl">com estoque baixo</span>
        </div>
      </div>
      <div className="card-grid">
        {lista.map((p) => {
          const status = statusOf(p.atual, p.estoque_minimo);
          const ref = Math.max((p.estoque_minimo || 0) * 2, p.atual, 1);
          const pct = Math.min(100, Math.max(0, (p.atual / ref) * 100));
          return (
            <div className="card" key={p.id} style={{ '--cat-color': catColor(p.categoria) }}>
              {status === 'baixo' && <span className="stamp">Repor estoque</span>}
              <div className="card-cat">{p.categoria}{p.codigo ? ` · ${p.codigo}` : ''}</div>
              <div className="card-name">{p.nome}</div>
              <div><span className="card-qty">{p.atual}</span><span className="card-unit">{p.unidade}</span></div>
              <div className="card-min">mínimo: {p.estoque_minimo} {p.unidade}</div>
              <div className="gauge"><div className={`gauge-fill ${status}`} style={{ width: pct + '%' }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------- RELATÓRIOS ----------------------------------- */

function RelatoriosTab({ animais, produtos, entradas, clinica, trato, coleta, observacoes }) {
  const [periodo, setPeriodo] = useState('semana');

  const coletaP = coleta.filter((c) => inPeriod(c.data, periodo));
  const clinicaP = clinica.filter((c) => inPeriod(c.data, periodo));
  const tratoP = trato.filter((c) => inPeriod(c.data, periodo));
  const entradasP = entradas.filter((c) => inPeriod(c.data, periodo));
  const obsP = observacoes.filter((c) => inPeriod(c.data, periodo));

  const totalDoses = coletaP.reduce((s, c) => s + Number(c.doses), 0);
  const totalValorEntradas = entradasP.reduce((s, e) => s + Number(e.valor_unitario) * Number(e.quantidade), 0);

  const melhoresCavalos = useMemo(() => {
    const map = {};
    coleta.forEach((c) => { map[c.animal_id] = (map[c.animal_id] || 0) + Number(c.doses); });
    return Object.entries(map)
      .map(([id, doses]) => ({ nome: nomeOf(animais, id), doses }))
      .sort((a, b) => b.doses - a.doses)
      .slice(0, 6);
  }, [coleta, animais]);

  const dosesPorMes = useMemo(() => {
    const map = {};
    coleta.forEach((c) => {
      const mes = (c.data || '').slice(0, 7);
      if (!mes) return;
      map[mes] = (map[mes] || 0) + Number(c.doses);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([mes, doses]) => ({ mes, doses }));
  }, [coleta]);

  const consumoMedicamentos = useMemo(() => {
    const map = {};
    clinica.forEach((c) => {
      const nome = nomeOf(produtos, c.medicamento_id);
      map[nome] = (map[nome] || 0) + Number(c.quantidade_ml);
    });
    return Object.entries(map).map(([nome, ml]) => ({ nome, ml })).sort((a, b) => b.ml - a.ml).slice(0, 6);
  }, [clinica, produtos]);

  const PERIODOS = [{ id: 'hoje', label: 'Hoje' }, { id: 'semana', label: 'Últimos 7 dias' }, { id: 'mes', label: 'Este mês' }, { id: 'tudo', label: 'Tudo' }];

  return (
    <div>
      <div className="period-bar">
        {PERIODOS.map((p) => <button key={p.id} className={`subtab ${periodo === p.id ? 'active' : ''}`} onClick={() => setPeriodo(p.id)} type="button">{p.label}</button>)}
      </div>

      <div className="dash-grid">
        <div className="dash-chip"><span className="num">{coletaP.length}</span><span className="lbl">coletas</span></div>
        <div className="dash-chip"><span className="num">{totalDoses}</span><span className="lbl">doses coletadas</span></div>
        <div className="dash-chip"><span className="num">{clinicaP.length}</span><span className="lbl">atendimentos clínicos</span></div>
        <div className="dash-chip"><span className="num">{tratoP.length}</span><span className="lbl">tratos</span></div>
        <div className="dash-chip"><span className="num">{obsP.length}</span><span className="lbl">observações</span></div>
        <div className="dash-chip"><span className="num">{fmtMoney(totalValorEntradas)}</span><span className="lbl">entradas de produto (valor)</span></div>
      </div>

      <div className="chart-card">
        <h4>Doses coletadas por mês</h4>
        {dosesPorMes.length === 0 ? <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Sem coletas registradas ainda.</p> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dosesPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9D0BB" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6E7560' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6E7560' }} />
              <Tooltip />
              <Bar dataKey="doses" fill="#3F5C44" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h4>Melhores cavalos (total de doses)</h4>
        {melhoresCavalos.length === 0 ? <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Sem coletas registradas ainda.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(180, melhoresCavalos.length * 40)}>
            <BarChart data={melhoresCavalos} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9D0BB" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#6E7560' }} />
              <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 12, fill: '#6E7560' }} />
              <Tooltip />
              <Bar dataKey="doses" fill="#C99A3B" radius={[0, 4, 4, 0]}>
                {melhoresCavalos.map((_, i) => <Cell key={i} fill={i === 0 ? '#B8542B' : '#C99A3B'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h4>Consumo de medicamentos (ml total)</h4>
        {consumoMedicamentos.length === 0 ? <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Sem atendimentos registrados ainda.</p> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={consumoMedicamentos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9D0BB" />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#6E7560' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6E7560' }} />
              <Tooltip />
              <Bar dataKey="ml" fill="#B8542B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="section-title">Resumo do período</div>
      <DataTable
        emptyMsg="Sem lançamentos no período."
        rows={[
          { tipo: 'Clínica', qtd: clinicaP.length },
          { tipo: 'Trato', qtd: tratoP.length },
          { tipo: 'Coleta', qtd: coletaP.length },
          { tipo: 'Observações', qtd: obsP.length },
          { tipo: 'Entradas de produto', qtd: entradasP.length },
        ].filter((r) => r.qtd > 0)}
        columns={[{ key: 'tipo', label: 'Lançamento' }, { key: 'qtd', label: 'Quantidade', num: true }]}
      />
    </div>
  );
}

/* ----------------------------------- CADASTRO ----------------------------------- */

function CadastroProdutos({ produtos, onAdd, onDelete }) {
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('Insumo');
  const [unidade, setUnidade] = useState('');
  const [estoqueInicial, setEstoqueInicial] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!nome.trim() || !unidade.trim() || saving) return;
    setSaving(true);
    await onAdd({ nome: nome.trim(), codigo: codigo.trim(), categoria, unidade: unidade.trim(), estoque_inicial: parseFloat(estoqueInicial) || 0, estoque_minimo: parseFloat(estoqueMinimo) || 0 });
    setSaving(false);
    setNome(''); setCodigo(''); setUnidade(''); setEstoqueInicial(''); setEstoqueMinimo('');
  }

  return (
    <div>
      <div className="section-title">Cadastrar produto</div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field"><label>Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Penicilina, Diluente, Aveia" /></div>
          <div className="field"><label>Código</label><input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: MED-001" /></div>
          <div className="field"><label>Categoria</label><select value={categoria} onChange={(e) => setCategoria(e.target.value)}>{PRODUTO_CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}</select></div>
          <div className="field"><label>Unidade</label><input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex: ml, kg, frasco, saco" /></div>
          <div className="field"><label>Estoque inicial</label><input type="number" min="0" step="any" value={estoqueInicial} onChange={(e) => setEstoqueInicial(e.target.value)} placeholder="0" /></div>
          <div className="field"><label>Estoque mínimo (alerta)</label><input type="number" min="0" step="any" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} placeholder="0" /></div>
        </div>
        <div style={{ marginTop: '1rem' }}><button className="btn" type="submit" disabled={saving}><Plus size={16} /> {saving ? 'Salvando...' : 'Adicionar produto'}</button></div>
      </form>
      {produtos.length > 0 && (
        <>
          <hr className="divider" />
          <div className="section-title">Produtos cadastrados ({produtos.length})</div>
          <div className="items-list">
            {produtos.map((p) => (
              <div className="item-row" key={p.id}>
                <div className="meta">
                  <span className="badge" style={{ background: catColor(p.categoria) }}>{p.categoria}</span>
                  <span className="name">{p.nome}</span>
                  {p.codigo && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{p.codigo}</span>}
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>unidade: {p.unidade} · mín: {p.estoque_minimo}</span>
                </div>
                {confirmDelete === p.id ? (
                  <span><button className="btn danger" type="button" onClick={() => { onDelete(p.id); setConfirmDelete(null); }}>Confirmar</button> <button className="btn secondary" type="button" onClick={() => setConfirmDelete(null)}>Cancelar</button></span>
                ) : (
                  <button className="btn secondary" type="button" onClick={() => setConfirmDelete(p.id)}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CadastroAnimais({ animais, onAdd, onDelete }) {
  const [nome, setNome] = useState('');
  const [registro, setRegistro] = useState('');
  const [funcao, setFuncao] = useState(FUNCOES_ANIMAL[0]);
  const [observacao, setObservacao] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!nome.trim() || saving) return;
    setSaving(true);
    await onAdd({ nome: nome.trim(), registro: registro.trim(), funcao, observacao: observacao.trim() });
    setSaving(false);
    setNome(''); setRegistro(''); setObservacao('');
  }

  return (
    <div>
      <div className="section-title">Cadastrar animal</div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field"><label>Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cavalo" /></div>
          <div className="field"><label>Registro / identificação</label><input value={registro} onChange={(e) => setRegistro(e.target.value)} placeholder="Opcional" /></div>
          <div className="field"><label>Função</label><select value={funcao} onChange={(e) => setFuncao(e.target.value)}>{FUNCOES_ANIMAL.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Observações</label><textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Informações gerais" /></div>
        </div>
        <div style={{ marginTop: '1rem' }}><button className="btn" type="submit" disabled={saving}><Plus size={16} /> {saving ? 'Salvando...' : 'Adicionar animal'}</button></div>
      </form>
      {animais.length > 0 && (
        <>
          <hr className="divider" />
          <div className="section-title">Animais cadastrados ({animais.length})</div>
          <div className="items-list">
            {animais.map((a) => (
              <div className="item-row" key={a.id}>
                <div className="meta">
                  <span className="badge">{a.funcao}</span>
                  <span className="name">{a.nome}</span>
                  {a.registro && <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{a.registro}</span>}
                </div>
                {confirmDelete === a.id ? (
                  <span><button className="btn danger" type="button" onClick={() => { onDelete(a.id); setConfirmDelete(null); }}>Confirmar</button> <button className="btn secondary" type="button" onClick={() => setConfirmDelete(null)}>Cancelar</button></span>
                ) : (
                  <button className="btn secondary" type="button" onClick={() => setConfirmDelete(a.id)}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CadastroUsuarios({ users, onAdd, onDelete, currentUser }) {
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('operador');
  const [erro, setErro] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!nome.trim() || !login.trim() || !senha.trim() || saving) return;
    if (users.some((u) => u.login.toLowerCase() === login.trim().toLowerCase())) {
      setErro('Já existe um usuário com este login.');
      return;
    }
    setErro('');
    setSaving(true);
    await onAdd({ nome: nome.trim(), login: login.trim(), senha, perfil });
    setSaving(false);
    setNome(''); setLogin(''); setSenha('');
  }

  function tryDelete(u) {
    const admins = users.filter((x) => x.perfil === 'admin');
    if (u.perfil === 'admin' && admins.length <= 1) {
      setErro('Não é possível excluir o único usuário administrador.');
      return;
    }
    setErro('');
    onDelete(u.id);
    setConfirmDelete(null);
  }

  return (
    <div>
      <div className="section-title">Cadastrar usuário</div>
      {erro && <div className="login-error">{erro}</div>}
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field"><label>Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" /></div>
          <div className="field"><label>Login</label><input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="usuario.login" /></div>
          <div className="field"><label>Senha</label><input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="senha" /></div>
          <div className="field">
            <label>Perfil</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
              <option value="operador">Operador (lançamentos e leitura)</option>
              <option value="admin">Administrador (acesso total)</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}><button className="btn" type="submit" disabled={saving}><Plus size={16} /> {saving ? 'Salvando...' : 'Adicionar usuário'}</button></div>
      </form>
      <hr className="divider" />
      <div className="section-title">Usuários cadastrados ({users.length})</div>
      <div className="items-list">
        {users.map((u) => (
          <div className="item-row" key={u.id}>
            <div className="meta">
              <span className="badge" style={{ background: u.perfil === 'admin' ? '#B8542B' : '#3F5C44' }}>{u.perfil}</span>
              <span className="name">{u.nome}</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{u.login}</span>
            </div>
            {confirmDelete === u.id ? (
              <span><button className="btn danger" type="button" onClick={() => tryDelete(u)}>Confirmar</button> <button className="btn secondary" type="button" onClick={() => setConfirmDelete(null)}>Cancelar</button></span>
            ) : (
              <button className="btn secondary" type="button" onClick={() => setConfirmDelete(u.id)} disabled={u.id === currentUser.id}><Trash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>
      <div className="preview" style={{ marginTop: '1rem' }}>
        Atenção: as senhas ficam guardadas em texto simples na tabela "usuarios" do Supabase. Não utilize senhas que você usa em outros sistemas, e restrinja o acesso ao painel do Supabase a pessoas de confiança.
      </div>
    </div>
  );
}

function CadastroTab({ produtos, animais, users, currentUser, onAddProduto, onDeleteProduto, onAddAnimal, onDeleteAnimal, onAddUser, onDeleteUser }) {
  const [sub, setSub] = useState('produtos');
  return (
    <div>
      <div className="subtabs">
        <button className={`subtab ${sub === 'produtos' ? 'active' : ''}`} onClick={() => setSub('produtos')} type="button">Produtos</button>
        <button className={`subtab ${sub === 'animais' ? 'active' : ''}`} onClick={() => setSub('animais')} type="button">Animais</button>
        <button className={`subtab ${sub === 'usuarios' ? 'active' : ''}`} onClick={() => setSub('usuarios')} type="button">Usuários</button>
      </div>
      {sub === 'produtos' && <CadastroProdutos produtos={produtos} onAdd={onAddProduto} onDelete={onDeleteProduto} />}
      {sub === 'animais' && <CadastroAnimais animais={animais} onAdd={onAddAnimal} onDelete={onDeleteAnimal} />}
      {sub === 'usuarios' && <CadastroUsuarios users={users} onAdd={onAddUser} onDelete={onDeleteUser} currentUser={currentUser} />}
    </div>
  );
}

/* ------------------------------------- APP ------------------------------------- */

const SESSION_KEY = 'ccps_equinos_session';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('clinica');
  const [errorMsg, setErrorMsg] = useState(null);

  const [users, setUsers] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [clinica, setClinica] = useState([]);
  const [trato, setTrato] = useState([]);
  const [coleta, setColeta] = useState([]);
  const [observacoes, setObservacoes] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [u, p, a, e, c, t, co, ob] = await Promise.all([
          supabase.from('usuarios').select('*').order('created_at'),
          supabase.from('produtos').select('*').order('created_at'),
          supabase.from('animais').select('*').order('created_at'),
          supabase.from('entradas').select('*').order('created_at'),
          supabase.from('clinica').select('*').order('created_at'),
          supabase.from('trato').select('*').order('created_at'),
          supabase.from('coleta').select('*').order('created_at'),
          supabase.from('observacoes').select('*').order('created_at'),
        ]);
        for (const r of [u, p, a, e, c, t, co, ob]) {
          if (r.error) throw r.error;
        }
        setUsers(u.data || []);
        setProdutos(p.data || []);
        setAnimais(a.data || []);
        setEntradas(e.data || []);
        setClinica(c.data || []);
        setTrato(t.data || []);
        setColeta(co.data || []);
        setObservacoes(ob.data || []);

        const savedId = localStorage.getItem(SESSION_KEY);
        if (savedId) {
          const found = (u.data || []).find((x) => x.id === savedId);
          if (found) setSession(found);
        }
      } catch (e) {
        setErrorMsg('Erro ao conectar ao banco de dados: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addRow(table, payload, list, setter) {
    try {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      setter([...list, data]);
      return data;
    } catch (e) {
      setErrorMsg('Erro ao salvar: ' + e.message);
    }
  }

  async function removeRow(table, id, list, setter) {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setter(list.filter((x) => x.id !== id));
    } catch (e) {
      setErrorMsg('Erro ao excluir: ' + e.message);
    }
  }

  function handleLogin(u) {
    setSession(u);
    setTab('clinica');
    localStorage.setItem(SESSION_KEY, u.id);
  }

  function handleLogout() {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  }

  const TABS = [
    { id: 'clinica', label: 'Clínica', icon: Stethoscope },
    { id: 'trato', label: 'Trato', icon: Wheat },
    { id: 'coleta', label: 'Coleta', icon: Droplet },
    { id: 'observacoes', label: 'Observações', icon: MessageSquare },
    { id: 'entrada', label: 'Cadastro de produto', icon: PackagePlus },
    { id: 'estoque', label: 'Estoque', icon: Boxes },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  ];
  if (session?.perfil === 'admin') TABS.push({ id: 'cadastro', label: 'Cadastro', icon: Settings });

  if (loading) {
    return (
      <div className="app"><style>{CSS}</style>
        <div className="loading"><Loader2 size={20} className="spin" /> Carregando...</div>
      </div>
    );
  }

  if (errorMsg && users.length === 0) {
    return (
      <div className="app"><style>{CSS}</style>
        <div className="login-page"><div className="login-card"><div className="login-error">{errorMsg}</div><p className="sub">Verifique se o script SQL foi executado no Supabase e se a URL/chave estão corretas.</p></div></div>
      </div>
    );
  }

  if (!session) return <LoginScreen users={users} onLogin={handleLogin} />;

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="shell">
        <div className="header">
          <div>
            <h1>CCPS Equinos</h1>
            <p>Seleon Biotecnologia Animal — controle de lançamentos e estoque</p>
          </div>
          <div className="user-bar">
            <UserIcon size={15} /> {session.nome}
            <span className="role-pill">{session.perfil}</span>
            <button className="logout-btn" onClick={handleLogout} title="Sair"><LogOut size={15} /></button>
          </div>
        </div>

        <div className="tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}><Icon size={15} /> {t.label}</button>;
          })}
        </div>

        <div className="panel">
          {tab === 'clinica' && <ClinicaTab animais={animais} produtos={produtos} entradas={entradas} clinica={clinica} trato={trato} currentUser={session} onAdd={(r) => addRow('clinica', r, clinica, setClinica)} />}
          {tab === 'trato' && <TratoTab animais={animais} produtos={produtos} entradas={entradas} clinica={clinica} trato={trato} currentUser={session} onAdd={(r) => addRow('trato', r, trato, setTrato)} />}
          {tab === 'coleta' && <ColetaTab animais={animais} currentUser={session} coleta={coleta} onAdd={(r) => addRow('coleta', r, coleta, setColeta)} />}
          {tab === 'observacoes' && <ObservacoesTab animais={animais} currentUser={session} observacoes={observacoes} onAdd={(r) => addRow('observacoes', r, observacoes, setObservacoes)} />}
          {tab === 'entrada' && <EntradaTab produtos={produtos} entradas={entradas} clinica={clinica} trato={trato} currentUser={session} onAdd={(r) => addRow('entradas', r, entradas, setEntradas)} />}
          {tab === 'estoque' && <EstoqueTab produtos={produtos} entradas={entradas} clinica={clinica} trato={trato} />}
          {tab === 'relatorios' && <RelatoriosTab animais={animais} produtos={produtos} entradas={entradas} clinica={clinica} trato={trato} coleta={coleta} observacoes={observacoes} />}
          {tab === 'cadastro' && session.perfil === 'admin' && (
            <CadastroTab
              produtos={produtos} animais={animais} users={users} currentUser={session}
              onAddProduto={(p) => addRow('produtos', p, produtos, setProdutos)}
              onDeleteProduto={(id) => removeRow('produtos', id, produtos, setProdutos)}
              onAddAnimal={(a) => addRow('animais', a, animais, setAnimais)}
              onDeleteAnimal={(id) => removeRow('animais', id, animais, setAnimais)}
              onAddUser={(u) => addRow('usuarios', u, users, setUsers)}
              onDeleteUser={(id) => removeRow('usuarios', id, users, setUsers)}
            />
          )}
          {errorMsg && <div className="preview warn" style={{ marginTop: '1rem' }}>{errorMsg}</div>}
        </div>
        <p className="footer-note">Dados salvos no Supabase e compartilhados entre todos os usuários do sistema.</p>
      </div>
    </div>
  );
}
