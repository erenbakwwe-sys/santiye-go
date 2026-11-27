'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { licenses,machines,Operator,OperatorRequest } from '@/lib/operator-service';

const input='block w-full rounded-lg border border-slate-300 p-2';
const fields=[
  ['full_name','Ad soyad','text'],['phone','Telefon','tel'],['city','Şehir','text'],['district','İlçe','text'],
  ['experience_years','Deneyim yılı','number'],['daily_rate','Günlük yevmiye (₺)','number']
] as const;

export default function OperatorPanel(){
  const [db]=useState(()=>createClient()),[profile,setProfile]=useState<Operator|null>(null);
  const [ready,setReady]=useState(false),[logged,setLogged]=useState(false),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(''),[requests,setRequests]=useState<OperatorRequest[]>([]);
  useEffect(()=>{let active=true;
    async function load(){
      const {data:{user}}=await db.auth.getUser();
      if(!active)return;
      setLogged(!!user);
      if(user){
        const {data,error}=await db.from('operators').select('*').eq('user_id',user.id).maybeSingle();
        if(error){console.error('operators okuma hatası:',error);throw new Error('Bilgileriniz yüklenemedi. Lütfen sayfayı yenileyin.');}
        if(!active)return;setProfile(data);
        if(data){
          const inbox=await db.from('operator_requests').select('id,site,start_date,days,note').eq('operator_id',data.id).order('created_at',{ascending:false});
          if(inbox.error){console.error('operator_requests okuma hatası:',inbox.error);throw new Error('Talepler yüklenemedi. Lütfen sayfayı yenileyin.');}
          if(active)setRequests(inbox.data);
        }
      }
      if(active)setReady(true);
    }
    load().catch(err=>{if(active)setMessage(err.message);});return ()=>{active=false;};
  },[db]);
  async function save(form:HTMLFormElement){
    const f=new FormData(form);
    const machine_types=f.getAll('machines').map(String);
    if(!machine_types.length){setMessage('En az bir makine seçin.');return;}
    const values={full_name:String(f.get('full_name')).trim(),phone:String(f.get('phone')).trim(),
      city:String(f.get('city')).trim(),district:String(f.get('district')).trim(),
      experience_years:Number(f.get('experience_years')),daily_rate:Number(f.get('daily_rate')),
      machine_types,license_classes:f.getAll('licenses').map(String),reference_projects:String(f.get('reference_projects')).trim(),
      is_available:profile?.is_available ?? f.has('available')};
    const query=profile?db.from('operators').update(values).eq('id',profile.id):db.from('operators').insert(values);
    const res=await query.select().single();
    if(res.error){console.error('operators kayıt hatası:',res.error);throw new Error('Bilgileriniz kaydedilemedi. Lütfen tekrar deneyin.');}
    setProfile(res.data);setMessage('Profil kaydedildi.');
  }
  async function run(task:()=>Promise<void>){
    setBusy(true);setMessage('');
    try{await task();}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-navy-900">
    <header className="rounded-2xl bg-navy-900 p-6 text-white"><Link href="/operatorler" className="text-orange-400">← Operatör Havuzu</Link><h1 className="mt-2 text-3xl font-black">Operatör paneli</h1></header>
    <p role="status">{message || (!ready?'Yükleniyor…':'')}</p>
    {ready && !logged && <Link href="/giris?redirect=/operator-paneli" className="font-bold text-orange-700">Profil oluşturmak için giriş yap</Link>}
    {ready && logged && <form className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;void run(()=>save(form));}}>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key,label,type])=><label key={key}>{label}<input className={input} name={key} type={type} required
          min={0} max={key==='experience_years'?80:undefined}
          step={key==='daily_rate'?0.01:1} defaultValue={profile?.[key]??''}/></label>)}
        {([['machines','Kullandığım makineler',machines,profile?.machine_types],['licenses','Belgelerim',licenses,profile?.license_classes]] as const)
          .map(([name,title,options,selected])=><fieldset key={name}><legend className="font-bold">{title}</legend>{options.map(v=><label key={v} className="block py-1"><input type="checkbox" name={name} value={v} defaultChecked={selected?.includes(v)}/> {v}</label>)}</fieldset>)}
        <label className="sm:col-span-2">Referans şantiyeler<textarea name="reference_projects" className={input} defaultValue={profile?.reference_projects}/></label>
        <label><input name="available" type="checkbox" {...(profile?{checked:profile.is_available,onChange:()=>void run(async()=>{
          const {data,error}=await db.from('operators').update({is_available:!profile.is_available}).eq('id',profile.id).select().single();
          if(error){console.error('müsaitlik güncelleme hatası:',error);throw new Error('Bilgileriniz kaydedilemedi. Lütfen tekrar deneyin.');}setProfile(data);setMessage('Müsaitlik güncellendi.');
        })}:{defaultChecked:true})}/> Müsaitim / İş arıyorum</label>
        <button className="rounded-lg bg-orange-500 px-4 py-3 font-bold">Profili kaydet</button>
      </fieldset></form>}
    {profile && <section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Gelen talepler</h2>
      {!requests.length && <p>Henüz talep yok.</p>}{requests.map(r=><article key={r.id} className="border-t pt-3"><strong>{r.site}</strong><p>{r.start_date} · {r.days} gün</p><p>{r.note}</p></article>)}</section>}
  </main>;
}
