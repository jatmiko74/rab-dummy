"use client";
import React, { useEffect, useMemo, useState } from "react";

/** ===== Types ===== */
type RabNode = {
  id: string;
  parentId: string | null;
  kode?: string;
  uraian: string;
  satuan?: string;
  volume?: number;
  harga_satuan?: number;
  urutan?: number;
};
type RabProject = {
  id: string;
  kode: string;
  nama: string;
  tanggal?: string;
};

/** ===== Helpers ===== */
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n?: number) => (n ?? 0).toLocaleString("id-ID");
const subtotal = (node: RabNode, all: RabNode[]): number => {
  const self = (node.volume ?? 0) * (node.harga_satuan ?? 0);
  const kids = all.filter((x) => x.parentId === node.id);
  return self + kids.reduce((s, k) => s + subtotal(k, all), 0);
};
const toTree = (list: RabNode[]) => {
  const map = new Map<string, RabNode & { children: RabNode[] }>();
  list.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: (RabNode & { children: RabNode[] })[] = [];
  map.forEach((n) => {
    if (n.parentId) map.get(n.parentId)?.children.push(n);
    else roots.push(n);
  });
  const sortDeep = (nodes: any[]) => {
    nodes.sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
    nodes.forEach((c) => sortDeep(c.children));
  };
  sortDeep(roots);
  return roots;
};

/** ===== Seed ===== */
const seedRows: RabNode[] = [
  { id: "1", parentId: null, kode: "1", uraian: "Biaya Personel", urutan: 1 },
  { id: "1a", parentId: "1", kode: "a", uraian: "Honorarium Leader", satuan: "orang", volume: 1, harga_satuan: 500_000, urutan: 1 },
  { id: "1b", parentId: "1", kode: "b", uraian: "Honorarium tim assessment", satuan: "orang", volume: 1, harga_satuan: 6_000_000, urutan: 2 },
];

/** ===== Editor Row (recursive) ===== */
function Row({
  n, all, setAll, depth = 0,
}: { n: RabNode; all: RabNode[]; setAll: (rows: RabNode[]) => void; depth?: number; }) {
  const [open, setOpen] = useState(true);
  const children = all.filter((x) => x.parentId === n.id).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  const jumlah = (n.volume ?? 0) * (n.harga_satuan ?? 0);
  const sub = subtotal(n, all);

  const update = (patch: Partial<RabNode>) => setAll(all.map((x) => (x.id === n.id ? { ...x, ...patch } : x)));
  const addChild = () =>
    setAll([
      ...all,
      { id: uid(), parentId: n.id, uraian: "Item baru", urutan: (children.at(-1)?.urutan ?? 0) + 1 },
    ]);
  const remove = () => {
    const ids = new Set<string>();
    const walk = (id: string) => { ids.add(id); all.filter((x) => x.parentId === id).forEach((c) => walk(c.id)); };
    walk(n.id);
    setAll(all.filter((x) => !ids.has(x.id)));
  };
  const move = (dir: -1 | 1) => {
    const sibs = all.filter((x) => x.parentId === n.parentId).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
    const idx = sibs.findIndex((x) => x.id === n.id);
    const swapWith = sibs[idx + dir];
    if (!swapWith) return;
    const a = n.urutan ?? idx; const b = swapWith.urutan ?? (idx + dir);
    setAll(all.map((x) => (x.id === n.id ? { ...x, urutan: b } : x.id === swapWith.id ? { ...x, urutan: a } : x)));
  };

  return (
    <>
      <div
        className="grid grid-cols-[7rem_1fr_6rem_8rem_10rem_12rem_10rem] gap-2 items-center px-2 py-1 border-b bg-white"
        style={{ paddingLeft: depth * 12 }}
      >
        <div className="text-sm text-gray-600 flex items-center gap-1">
          {children.length > 0 && (
            <button onClick={() => setOpen((v) => !v)} className="w-5 h-5 rounded border flex items-center justify-center text-xs">
              {open ? "−" : "+"}
            </button>
          )}
          <input className="w-16 border rounded px-1 text-sm" value={n.kode ?? ""} onChange={(e) => update({ kode: e.target.value })} placeholder="kode" />
        </div>
        <input className="border rounded px-2 py-1 text-sm" value={n.uraian} onChange={(e) => update({ uraian: e.target.value })} />
        <input className="border rounded px-2 py-1 text-sm text-right" value={n.satuan ?? ""} onChange={(e) => update({ satuan: e.target.value })} />
        <input type="number" step="0.01" className="border rounded px-2 py-1 text-sm text-right" value={n.volume ?? ""} onChange={(e) => update({ volume: e.target.value === "" ? undefined : Number(e.target.value) })} />
        <input type="number" step="0.01" className="border rounded px-2 py-1 text-sm text-right" value={n.harga_satuan ?? ""} onChange={(e) => update({ harga_satuan: e.target.value === "" ? undefined : Number(e.target.value) })} />
        <div className="text-sm text-right font-semibold">{(jumlah || children.length) ? `Rp ${fmt(jumlah || sub)}` : ""}</div>
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => move(-1)} className="px-2 py-1 text-xs border rounded">↑</button>
          <button onClick={() => move(1)}  className="px-2 py-1 text-xs border rounded">↓</button>
          <button onClick={addChild} className="px-2 py-1 text-xs border rounded">+ Sub</button>
          <button onClick={remove} className="px-2 py-1 text-xs border rounded text-red-600">Hapus</button>
        </div>
      </div>
      {open && children.map((c) => (
        <Row key={c.id} n={c} all={all} setAll={setAll} depth={depth + 1} />
      ))}
    </>
  );
}

/** ===== Preview ===== */
function Preview({ project, rows }: { project: RabProject; rows: RabNode[] }) {
  const roots = useMemo(() => toTree(rows), [rows]);
  const total = useMemo(() => rows.filter(r => r.parentId === null).reduce((s, r) => s + subtotal(r, rows), 0), [rows]);

  const RowView = ({ node, depth = 0 }: { node: any; depth?: number }) => {
    const jumlah = (node.volume ?? 0) * (node.harga_satuan ?? 0);
    const sub = subtotal(node, rows);
    const hasKids = node.children?.length > 0;
    return (
      <>
        <div className="grid grid-cols-[7rem_1fr_6rem_8rem_10rem_12rem] gap-2 items-center px-2 py-1 border-b" style={{ paddingLeft: depth * 12 }}>
          <div className="text-sm text-gray-600 font-medium">{node.kode ?? ""}</div>
          <div className="text-sm">{node.uraian}</div>
          <div className="text-sm text-right text-gray-600">{node.satuan ?? ""}</div>
          <div className="text-sm text-right">{node.volume ?? ""}</div>
          <div className="text-sm text-right">{node.harga_satuan ? `Rp ${fmt(node.harga_satuan)}` : ""}</div>
          <div className="text-sm text-right font-semibold">{jumlah ? `Rp ${fmt(jumlah)}` : hasKids ? `Rp ${fmt(sub)}` : ""}</div>
        </div>
        {hasKids && node.children.map((c: any) => <RowView key={c.id} node={c} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="text-lg font-bold">Rencana Anggaran Biaya (RAB)</h2>
          <div className="text-sm text-gray-600">{project.kode} — {project.nama}</div>
          {project.tanggal && <div className="text-sm text-gray-600">Tanggal: {new Date(project.tanggal).toLocaleDateString("id-ID")}</div>}
        </div>
      </div>
      <div className="grid grid-cols-[7rem_1fr_6rem_8rem_10rem_12rem] gap-2 px-2 py-2 bg-gray-100 font-medium text-sm border-b">
        <div>No/Kode</div><div>Uraian Pekerjaan</div>
        <div className="text-right">Satuan</div>
        <div className="text-right">Volume</div>
        <div className="text-right">Harga Satuan (Rp)</div>
        <div className="text-right">Jumlah Harga (Rp)</div>
      </div>
      {roots.map((node) => <RowView key={node.id} node={node} />)}
      <div className="grid grid-cols-[7rem_1fr_6rem_8rem_10rem_12rem] gap-2 px-2 py-3 bg-gray-50 text-base font-semibold">
        <div></div><div>Total Biaya</div><div></div><div></div><div></div>
        <div className="text-right">Rp {fmt(total)}</div>
      </div>
    </div>
  );
}

/** ===== Main App (3 langkah) ===== */
export default function RabDummyApp() {
  const [project, setProject] = useState<RabProject>(() => ({
    id: uid(),
    kode: "RAB-001",
    nama: "RAB Pelatihan Jahit Menjahit",
    tanggal: new Date().toISOString().slice(0, 10),
  }));
  const [rows, setRows] = useState<RabNode[]>(seedRows);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Simpan ke localStorage biar tahan refresh
  useEffect(() => { localStorage.setItem("rab.project", JSON.stringify(project)); }, [project]);
  useEffect(() => { localStorage.setItem("rab.rows", JSON.stringify(rows)); }, [rows]);

  const total = useMemo(() => rows.filter(r => r.parentId === null).reduce((s, r) => s + subtotal(r, rows), 0), [rows]);
  const addRoot = () =>
    setRows([...rows, { id: uid(), parentId: null, uraian: "Kelompok baru", urutan: (rows.filter(r => r.parentId === null).at(-1)?.urutan ?? 0) + 1 }]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Step n={1} label="Buat RAB" active={step===1} onClick={() => setStep(1)} />
        <Dash />
        <Step n={2} label="Editor" active={step===2} onClick={() => setStep(2)} />
        <Dash />
        <Step n={3} label="Preview" active={step===3} onClick={() => setStep(3)} />
      </div>

      {step === 1 && (
        <div className="bg-white rounded shadow p-4 space-y-3">
          <h1 className="text-lg font-bold mb-2">Buat RAB</h1>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm">Kode</label>
              <input className="border rounded w-full p-2" value={project.kode} onChange={(e)=>setProject({...project, kode: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm">Judul RAB</label>
              <input className="border rounded w-full p-2" value={project.nama} onChange={(e)=>setProject({...project, nama: e.target.value})} placeholder="RAB Pelatihan Jahit Menjahit" />
            </div>
            <div>
              <label className="block text-sm">Tanggal</label>
              <input type="date" className="border rounded w-full p-2" value={project.tanggal ?? ''} onChange={(e)=>setProject({...project, tanggal: e.target.value})} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3">
            <div className="text-sm text-gray-600">Total saat ini: <b>Rp {fmt(total)}</b></div>
            <div className="flex gap-2">
              <button className="px-3 py-2 border rounded" onClick={()=> setRows(seedRows)}>Gunakan Data Contoh</button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=> setStep(2)}>Lanjut ke Editor →</button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-white rounded shadow p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{project.kode} — {project.nama}</div>
              <div className="text-sm text-gray-600">Tanggal: {project.tanggal ? new Date(project.tanggal).toLocaleDateString("id-ID") : '-'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={addRoot} className="px-3 py-2 bg-green-600 text-white rounded">+ Kelompok Root</button>
              <button onClick={()=> setStep(1)} className="px-3 py-2 border rounded">← Ubah Judul</button>
              <button onClick={()=> setStep(3)} className="px-3 py-2 bg-blue-600 text-white rounded">Lihat Preview →</button>
            </div>
          </div>

          <div className="bg-white rounded shadow overflow-hidden">
            <div className="grid grid-cols-[7rem_1fr_6rem_8rem_10rem_12rem_10rem] gap-2 px-2 py-2 bg-gray-100 font-medium text-sm border-b">
              <div>No/Kode</div>
              <div>Uraian</div>
              <div className="text-right">Satuan</div>
              <div className="text-right">Volume</div>
              <div className="text-right">Harga Satuan (Rp)</div>
              <div className="text-right">Jumlah/Subtotal</div>
              <div className="text-right">Aksi</div>
            </div>
            {toTree(rows).map((r) => <Row key={r.id} n={r} all={rows} setAll={setRows} />)}
            <div className="grid grid-cols-[7rem_1fr_6rem_8rem_10rem_12rem_10rem] gap-2 px-2 py-3 bg-gray-50 text-base font-semibold">
              <div></div><div>Total Biaya</div><div></div><div></div><div></div>
              <div className="text-right">Rp {fmt(total)}</div>
              <div></div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={()=> setStep(2)} className="px-3 py-2 border rounded">← Kembali ke Editor</button>
            <button onClick={()=> setStep(1)} className="px-3 py-2 border rounded">Ubah Judul</button>
          </div>
          <Preview project={project} rows={rows} />
        </div>
      )}
    </div>
  );
}

/** ===== Small UI bits ===== */
function Step({ n, label, active, onClick }: { n: number; label: string; active: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-1 rounded-full border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>
      <span className={`w-6 h-6 text-sm rounded-full flex items-center justify-center ${active ? 'bg-white text-blue-600' : 'bg-gray-100'}`}>{n}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
function Dash() { return <div className="h-px w-8 bg-gray-300" />; }
