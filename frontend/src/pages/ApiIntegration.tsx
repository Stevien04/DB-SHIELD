import { useEffect, useState } from 'react';
import api from '../services/api';
import { loadDatabaseConnections } from '../services/databaseConnections';
import { CopyBlock } from './ProxyPanel';
import { Link } from 'react-router-dom';
export default function ApiIntegration() {
    const [databases,setDatabases]=useState<any[]>([]);
    const [selected,setSelected]=useState('');
    const [keys,setKeys]=useState<any[]>([]);
    const [secret,setSecret]=useState('');
    const [name,setName]=useState('Mi backend');
    const [writes,setWrites]=useState(false);
    const [scheme,setScheme]=useState('https');
    const [error,setError]=useState('');
    const [busy,setBusy]=useState(false);
    useEffect(()=>{let done=false; loadDatabaseConnections().then(({databases:rows})=>{if(!done){const active=rows.filter(row=>row.active&&['POSTGRES','PostgreSQL'].includes(row.type));setDatabases(active);setSelected(active.length?String(active[0].id):'');}}).catch(()=>{if(!done)setError('No se pudieron cargar las bases.');});return()=>{done=true;};},[]);
    useEffect(()=>{setKeys([]);setSecret('');setError('');if(!selected)return;let done=false;api.get('/integration/keys',{params:{databaseId:selected}}).then(({data})=>{if(!done)setKeys(data);}).catch(()=>{if(!done)setError('No se pudieron cargar las claves.');});return()=>{done=true;};},[selected]);
    const refresh=async()=>{const {data}=await api.get('/integration/keys',{params:{databaseId:selected}});setKeys(data);};
    const create=async()=>{setBusy(true);setError('');try{const {data}=await api.post('/integration/keys',{databaseId:Number(selected),name,allowWrites:writes});setSecret(data.key);await refresh();}catch(e:any){setError(e.response?.data?.message||'No se pudo crear la clave.');}finally{setBusy(false);}};
    const revoke=async(id:number)=>{setBusy(true);setError('');try{await api.delete(`/integration/keys/${id}`);setSecret('');await refresh();}catch{setError('No se pudo revocar la clave.');}finally{setBusy(false);}};
    const endpoint=`${scheme}://${window.location.host}/api/v1/integration/query`;
    const body=JSON.stringify({databaseId:Number(selected),query:'SELECT ? AS valor',parameters:[10]},null,2);
    const example=`const response = await fetch('${endpoint}', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'X-API-Key': process.env.DBSHIELD_API_KEY\n  },\n  body: JSON.stringify({\n    databaseId: ${Number(selected)},\n    query: 'SELECT ? AS valor',\n    parameters: [10]\n  })\n});\nconst result = await response.json();\nif (!response.ok) throw new Error(result.message);\nconsole.log(result);`;
    return <div style={{padding:32,background:'#f8fafc',color:'#172033',minHeight:'100%'}}>
        <style>{`.api-form{background:white;padding:20px;border-radius:12px;margin:20px 0}.api-form label{display:block;margin:12px 0}.api-form select,.api-form input[type=text]{padding:10px;border:1px solid #cbd5e1;border-radius:8px;width:100%}.api-form button,.api-key-list button{padding:10px 16px;background:#0284c7;color:white;border:0;border-radius:8px;cursor:pointer}.proxy-copy{background:white;padding:20px;border-radius:12px;margin:20px 0}.proxy-copy-title{display:flex;justify-content:space-between;align-items:center;gap:12px}.proxy-copy-title h3{margin:0}.proxy-copy button{display:flex;align-items:center;gap:8px;background:#0284c7;color:white;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}.proxy-copy pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;line-height:1.7}.api-key-list{width:100%;text-align:left;border-collapse:collapse}.api-key-list td,.api-key-list th{padding:10px;border-bottom:1px solid #e2e8f0}`}</style>
        <h1>API de protección</h1><p>Tu backend envía consultas por HTTP o HTTPS. DB-Shield las inspecciona por el proxy y ejecuta únicamente las permitidas en la base seleccionada.</p>
        <div className="api-form"><label>Base de datos<select value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy}>{!databases.length&&<option value="">No hay bases PostgreSQL activas</option>}{databases.map(db=><option key={db.id} value={db.id}>{db.name} — {db.host}</option>)}</select></label><p>Primero habilita la protección de esta base en el <Link to="/proxy">panel Proxy</Link>. Tus clientes no necesitan túnel SSH.</p>
        <label>Nombre de la clave<input type="text" value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label>
        <label><input type="checkbox" checked={writes} onChange={e=>setWrites(e.target.checked)}/> Permitir INSERT, UPDATE y DELETE que cumplan la política</label>
        <button disabled={busy||!selected||!name.trim()} onClick={create}>{busy?'Procesando…':'Crear clave de API'}</button>
        <p>Solo lectura por defecto. Las claves vencen en 30 días y se guardan como huellas, nunca en texto plano.</p></div>
        {error&&<p role="alert" style={{color:'#dc2626'}}>{error}</p>}
        {secret&&<><CopyBlock title="Guarda tu clave: solo se muestra ahora" code={secret}/><button onClick={()=>setSecret('')}>Ocultar clave</button><p>Guárdala como DBSHIELD_API_KEY en las variables privadas del backend. No la coloques en el frontend.</p></>}
        {!!keys.length&&<div style={{overflowX:'auto'}}><table className="api-key-list"><thead><tr><th>Nombre</th><th>Prefijo</th><th>Permisos</th><th>Vencimiento</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{keys.map(key=><tr key={key.id}><td>{key.nombre}</td><td>{key.prefijo}…</td><td>{key.permite_escritura?'Lectura y escritura':'Lectura'}</td><td>{new Date(key.vence).toLocaleString()}</td><td>{!key.activa?'Revocada':new Date(key.vence)<new Date()?'Vencida':'Activa'}</td><td>{key.activa&&<button disabled={busy} onClick={()=>revoke(key.id)}>Revocar</button>}</td></tr>)}</tbody></table></div>}
        {selected&&<><div className="api-form"><label>Protocolo<select value={scheme} onChange={e=>setScheme(e.target.value)}><option value="https">HTTPS — recomendado</option><option value="http">HTTP — solo pruebas</option></select></label>{scheme==='http'&&<p style={{color:'#b45309'}}>HTTP transmite la clave y los datos sin cifrado. Usa HTTPS en producción.</p>}</div>
        <CopyBlock title="Endpoint POST" code={endpoint}/><CopyBlock title="Cuerpo JSON" code={body}/><CopyBlock title="Ejemplo Node.js para tu backend" code={example}/></>}
        <p>Usa ? para los parámetros, sin concatenar entradas del usuario. Una consulta por solicitud, una transacción por solicitud; no se comparten transacciones entre llamadas. Máximo 100 filas y 10 segundos. Las conexiones directas a la base evitan esta protección.</p>
    </div>;
}
