'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { blank,categories,Item,parseBoq,sample,units } from '@/lib/boq-parser';
import { readBoqFile } from '@/lib/boq-files';
import { createClient } from '@/lib/supabase/client';

const field='rounded-lg border border-slate-300 bg-white px-2 py-2 text-navy-900';
const action='rounded-lg bg-orange-500 px-4 py-3 font-bold text-navy-900 hover:bg-orange-400 disabled:opacity-50';
type Place={id:number;name:string};
type Group={category:string;request_id:string;recipients:number};

export default function BoqPage(){
  const [tab,setTab]=useState<'file'|'text'>('file'),[raw,setRaw]=useState(''),[rows,setRows]=useState<Item[]>([]);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[summary,setSummary]=useState<Group[]|null>(null);
  const [cities,setCities]=useState<Place[]>([]),[districts,setDistricts]=useState<Place[]>([]);
  const [city,setCity]=useState(''),[district,setDistrict]=useState(''),[date,setDate]=useState('');
  const [db]=useState(()=>createClient()),token=useRef(''),lock=useRef(false);
  const selected=rows.filter(r=>r.selected);
  useEffect(()=>{let active=true;db.from('cities').select('id,name').order('name').then(({data,error})=>{
    if(active){setCities(data||[]);if(error)setNotice('Şehirler yüklenemedi. Bağlantıyı kontrol edin.');}
  });return ()=>{active=false;};},[db]);
  useEffect(()=>{if(!city)return;let active=true;db.from('districts').select('id,name').eq('city_id',city).order('name').then(({data,error})=>{
    if(active){setDistricts(data||[]);if(error)setNotice('İlçeler yüklenemedi.');}
  });return ()=>{active=false;};},[city,db]);
  async function work(fn:()=>Promise<void>){
    if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
    try{await fn();}catch(err){setNotice(err instanceof Error?err.message:'İşlem tamamlanamadı.');}
    finally{lock.current=false;setBusy(false);}
  }
  async function parse(text:string){
    if(!text.trim() || text.length>100000)throw new Error('1–100.000 karakter arasında bir liste girin.');
    let items=parseBoq(text);
    if(items.length>200)throw new Error('Tek yüklemede en fazla 200 kalem kullanın.');
    try{
      const response=await fetch('/api/boq/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:AbortSignal.timeout(10000)});
      if(response.ok){const data=await response.json();if(Array.isArray(data.items))items=data.items;}
    }catch(err){
      // Yerel ayrıştırma çevrimdışı da çalışır; yalnız hiç kalem çıkmadıysa kullanıcıya bildir.
      console.error('BOQ ayrıştırma isteği başarısız:',err);
      if(!items.length)throw new Error('Dosya okunamadı. Farklı bir dosya deneyin ya da listeyi yapıştırın.');
    }
    token.current='';setRows(items);setNotice(items.length+' kalem okundu. Göndermeden önce miktarları ve birimleri kontrol edin.');
  }
  function upload(file?:File){if(file)void work(async()=>parse(await readBoqFile(file)));}
  function edit(id:string,value:Partial<Item>){token.current='';setRows(old=>old.map(r=>r.id===id?{...r,...value}:r));}
  async function submit(){
    if(!selected.length || selected.some(r=>!r.item_name.trim() || !(r.quantity>0)))throw new Error('Seçili her kaleme ad ve pozitif miktar girin.');
    if(!(await db.auth.getUser()).data.user)throw new Error('Dağıtım için önce oturum açın.');
    token.current ||= crypto.randomUUID();
    const {data,error}=await db.rpc('submit_boq',{p_token:token.current,p_items:selected,p_city:Number(city),p_district:Number(district),p_date:date});
    if(error){console.error('submit_boq hatası:',error);throw new Error('Talebiniz şu an iletilemedi. Lütfen seçili kalemleri ve bağlantınızı kontrol edip tekrar deneyin.');}
    setSummary(data as Group[]);
  }
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-8 text-navy-900">
    <header className="rounded-2xl bg-navy-900 p-6 text-white"><h1 className="text-3xl font-black">Keşif listesi yükle</h1></header>
    {summary ? <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Dağıtım özeti</h2>
      <p>{summary.length} kategori için talep kaydedildi. {summary.filter(g=>g.recipients>0).length} kategoride tedarikçi eşleşti.</p>
      {summary.map(g=><p key={g.request_id}>{g.category} · {g.recipients?g.recipients+' tedarikçiye iletildi':'Uygun tedarikçi bulunamadı'}</p>)}
      <Link className="font-bold text-orange-700" href="/alici-paneli/taleplerim">Teklif taleplerimi gör →</Link></section>:
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex gap-2">{(['file','text'] as const).map(t=><button key={t} aria-pressed={tab===t} className={tab===t?action:field} onClick={()=>setTab(t)}>{t==='file'?'Dosya yükle':'Liste yapıştır'}</button>)}</div>
        {tab==='file'?<label onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();upload(e.dataTransfer.files[0]);}} className="block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center">
          XLSX, CSV, TSV, TXT veya metin içeren PDF dosyanızı buraya bırakın
          <input className="mx-auto mt-3 block max-w-full" type="file" accept=".xlsx,.csv,.tsv,.txt,.pdf" onChange={e=>{upload(e.target.files?.[0]);e.target.value='';}}/></label>:
          <><textarea aria-label="Malzeme listesi" className={field+' min-h-40 w-full'} value={raw} onChange={e=>setRaw(e.target.value)}/>
          <div className="flex gap-2"><button className={field} onClick={()=>setRaw(sample)}>Örnek doldur</button>
          <button className={action} onClick={()=>work(()=>parse(raw))}>Kalemleri ayrıştır</button></div></>}
      </section>
      <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Keşif kalemleri</h2>
        {rows.length>0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Seç','Malzeme / hizmet','Miktar','Birim','Kategori','Not',''].map(h=><th key={h} className="p-1 text-left">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r,i)=><tr key={r.id}>
            <td><input aria-label={(i+1)+'. kalemi seç'} type="checkbox" checked={r.selected} onChange={e=>edit(r.id,{selected:e.target.checked})}/></td>
            <td><input aria-label="Kalem adı" className={field} value={r.item_name} onChange={e=>edit(r.id,{item_name:e.target.value})}/></td>
            <td><input aria-label="Miktar" className={field+' w-24'} type="number" min="0" step="any" value={r.quantity||''} onChange={e=>edit(r.id,{quantity:Number(e.target.value)})}/></td>
            <td><select aria-label="Birim" className={field} value={r.unit} onChange={e=>edit(r.id,{unit:e.target.value as Item['unit']})}>{units.map(u=><option key={u}>{u}</option>)}</select></td>
            <td><select aria-label="Kategori" className={field} value={r.category} onChange={e=>edit(r.id,{category:e.target.value as Item['category']})}>{categories.map(c=><option key={c}>{c}</option>)}</select></td>
            <td><input aria-label="Not" className={field} value={r.notes} onChange={e=>edit(r.id,{notes:e.target.value})}/></td>
            <td><button onClick={()=>{token.current='';setRows(rows.filter(x=>x.id!==r.id));}}>Çıkar</button></td>
          </tr>)}</tbody></table></div>}
        <button disabled={rows.length>=200} className={field} onClick={()=>{token.current='';setRows([...rows,blank()]);}}>+ Kalem ekle</button></section>
      <form className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-5" onChange={()=>{token.current='';}} onSubmit={e=>{e.preventDefault();void work(submit);}}>
        <label>Şehir<select className={field+' block'} required value={city} onChange={e=>{setCity(e.target.value);setDistrict('');setDistricts([]);}}><option value="">Seçin</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>İlçe<select className={field+' block'} required value={district} onChange={e=>setDistrict(e.target.value)}><option value="">Seçin</option>{districts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Teslim tarihi<input className={field+' block'} required type="date" min={new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'})} value={date} onChange={e=>setDate(e.target.value)}/></label>
        <button className={action} disabled={!selected.length}>Seçili Kalemleri İlgili Tedarikçilere Toplu Teklif Olarak Dağıt ({selected.length})</button></form>
    </fieldset>}
    <p role="status">{busy?'İşleniyor…':notice}</p>
  </main>;
}
