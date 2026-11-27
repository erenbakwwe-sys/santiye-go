'use client';
import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import { directory,examples,fold,machines,OperatorCard,sendRequest,today } from '@/lib/operator-service';
import { isDemoFallbackAllowed } from '@/lib/config/runtime';
import { visibleItems } from '@/lib/utils/sample-content';

const input='w-full rounded-lg border border-slate-300 p-2 text-navy-900';
const isSample=(o:OperatorCard)=>o.id.startsWith('demo-');
const action='inline-block rounded-lg bg-orange-500 px-4 py-3 font-bold text-navy-900 hover:bg-orange-400 disabled:opacity-50';

export default function OperatorPool(){
  const [rows,setRows]=useState<OperatorCard[]>([]),[message,setMessage]=useState('Yükleniyor…');
  const [machine,setMachine]=useState(''),[city,setCity]=useState(''),[district,setDistrict]=useState('');
  const [available,setAvailable]=useState(false),[verified,setVerified]=useState(false);
  const [selected,setSelected]=useState<OperatorCard|null>(null);
  useEffect(()=>{let active=true;directory().then(data=>{if(active){setRows(data);setMessage('');}})
    .catch(()=>{if(active){setRows([]);setMessage(isDemoFallbackAllowed()?'Canlı liste alınamadı. Örnek profiller gösteriliyor.':'Canlı liste alınamadı. Lütfen daha sonra tekrar deneyin.');}});return ()=>{active=false;};},[]);
  const demoAllowed=isDemoFallbackAllowed();
  const realRows=rows.filter(o=>!isSample(o));
  const shown=visibleItems(realRows,examples,demoAllowed);
  const results=shown.filter(o=>(!machine || o.machine_types.includes(machine)) && fold(o.city).includes(fold(city))
    && fold(o.district).includes(fold(district)) && (!available || o.is_available) && (!verified || o.verified));
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-8 text-navy-900">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy-900 p-6 text-white">
      <h1 className="text-3xl font-black">Operatör Havuzu</h1><Link className={action} href="/operator-paneli">Operatör Olarak Kayıt Ol / Panelim</Link></header>
    <section aria-label="Operatör filtreleri" className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-3">
      <label>Makine tipi<select className={input} value={machine} onChange={e=>setMachine(e.target.value)}><option value="">Tümü</option>{machines.map(m=><option key={m}>{m}</option>)}</select></label>
      <label>Şehir<input className={input} value={city} onChange={e=>setCity(e.target.value)}/></label>
      <label>İlçe<input className={input} value={district} onChange={e=>setDistrict(e.target.value)}/></label>
      <label><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)}/> Sadece müsait olanlar</label>
      <label><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> Belge onaylı</label></section>
    {message && <p role="status">{message}</p>}
    {!message && !shown.length && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-xl font-black">Henüz kayıtlı operatör yok</h2>
      <p className="mt-2">Operatörler kayıt oldukça burada listelenecek. Operatörseniz profilinizi oluşturabilirsiniz.</p>
      <Link className={action+' mt-4'} href="/operator-paneli">Operatör olarak kayıt ol</Link></section>}
    {!message && shown.length>0 && !results.length && <p>Bu filtrelerle eşleşen operatör bulunamadı.</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{results.map(o=><article key={o.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap justify-between gap-1"><strong className={o.is_available?'text-green-700':'text-orange-700'}>{o.is_available?'Şu An Müsait':'Şantiyede'}</strong>{isSample(o) && <small>Örnek profil</small>}</div>
      <h2 className="text-xl font-black">{o.full_name}</h2><p>{o.city} / {o.district} · {o.experience_years} yıl deneyim</p>
      <div className="flex flex-wrap gap-1">{[...o.machine_types,...o.license_classes].map(s=><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold" key={s}>{s}</span>)}</div>
      {!isSample(o) && <p>{o.verified && '✓ Belge onaylı '}{o.rating!==null && '★ '+o.rating}</p>}<p>{o.reference_projects}</p>
      <strong className="mt-auto">{o.daily_rate.toLocaleString('tr-TR')} ₺ / gün</strong>
      {!isSample(o) && <button className={action} disabled={!o.is_available} onClick={()=>setSelected(o)}>Operatörü Çağır / Teklif İste</button>}</article>)}</div>
    {selected && <RequestDialog operator={selected} close={()=>setSelected(null)}/>}
  </main>;
}

function RequestDialog({operator,close}:{operator:OperatorCard;close:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false);
  useEffect(()=>{dialog.current?.showModal();},[]);
  const demo=operator.id.startsWith('demo-');
  return <dialog ref={dialog} onClose={close} aria-labelledby="request-title" className="w-full max-w-md rounded-2xl p-6 backdrop:bg-navy-900/60">
    <h2 id="request-title" className="mb-4 text-xl font-black">{operator.full_name} · Teklif iste</h2>
    {demo && <p>Örnek profil · Deneme talebi</p>}
    {!done && <form className="grid gap-3" onSubmit={async e=>{
      e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);
      try{if(!demo)await sendRequest(operator.id,{site:String(f.get('site')).trim(),start_date:String(f.get('start')),days:Number(f.get('days')),note:String(f.get('note')).trim()});
        setDone(true);setMessage(demo?'Deneme tamamlandı.':'Talep operatörün paneline iletildi.');
      }catch(err){setMessage((err as Error).message);}finally{setBusy(false);}
    }}>
      <label>Şantiye konumu<input name="site" required minLength={2} maxLength={300} className={input}/></label>
      <label>Başlangıç tarihi<input name="start" type="date" min={today()} required className={input}/></label>
      <label>Gün sayısı<input name="days" type="number" min="1" max="365" required defaultValue="1" className={input}/></label>
      <label>Not<textarea name="note" maxLength={2000} className={input}/></label>
      <button disabled={busy} className={action}>{demo?'Deneme talebini tamamla':'Talebi gönder'}</button></form>}
    <p role="status">{message}</p><button className="mt-3 font-bold" onClick={()=>dialog.current?.close()}>Kapat</button>
  </dialog>;
}
