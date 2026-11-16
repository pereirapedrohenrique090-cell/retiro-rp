
const $ = id => document.getElementById(id)
const pages = {dashboard:'Visão geral',animals:'Animais e pesagens',pastures:'Pastagens',feeds:'Suplementação',expenses:'Custos',sale:'Simulação e venda',bi:'Gráficos e tabelas'}
const iso = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date())
const date = offset => new Date(Date.parse(iso)+offset*86400000).toISOString().slice(0,10)
const id = () => crypto.randomUUID()
const labels = {animals:'Animal',weights:'Pesagem',pastures:'Pasto',feeds:'Suplemento',expenses:'Despesa',sale:'Projeção'}
const schema = {
 animals:[['tag','Brinco'],['name','Identificação'],['pasture','Pasto','pastures']],
 acquisition:[['acquisition','Valor de aquisição (R$)','number',0,undefined,0.01]],
 weights:[['animal','Animal','animals'],['date','Data','date'],['kg','Peso vivo (kg)','number',0.01]],
 pastures:[['name','Nome'],['grass','Forrageira'],['area','Área (ha)','number',0.01]],
 feeds:[['name','Produto'],['kind','Tipo',['Mineral','Proteinado']],['grams','Consumo (g/cabeça/dia)','number'],['price','Preço (R$/kg)','number'],['protein','Proteína bruta (%)','number',0,100],['start','Início','date'],['end','Fim (inclusive)','date'],['heads','Cabeças no período','number',1,9999,1],['mode','Uso',['Registrado','Simulação']],['gmd','GMD assumido (kg/dia)','number']],
 expenses:[['name','Descrição'],['kind','Categoria',['Alimentar','Operacional','Aquisição']],['date','Data','date'],['value','Valor do lote (R$)','number']],
 sale:[['days','Dias até a venda','number',1,3650,1],['gmd','GMD previsto (kg/dia)','number'],['price','Preço (R$/kg vivo)','number'],['feed','Suplemento projetado','feeds'],['other','Outros custos futuros do lote (R$)','number']]
}
const seed = () => {
 const pastures = [{id:id(),name:'Pasto principal',grass:'Braquiária',area:12}]
 const animals = Array.from({length:13},(_,i)=>({id:id(),tag:String(i+1).padStart(3,'0'),name:'Novilha '+(i+1),pasture:pastures[0].id,acquisition:1820+i*30}))
 const weights = animals.flatMap((a,i)=>[{id:id(),animal:a.id,date:date(-30),kg:300+i},{id:id(),animal:a.id,date:iso,kg:313+i}])
 const feed = {id:id(),name:'Sal mineral',kind:'Mineral',grams:80,price:4,protein:0,start:date(-30),end:date(-1),heads:13,mode:'Registrado',gmd:0.43}
 return {demo:true,animals,weights,pastures,feeds:[feed,{...feed,id:id(),name:'Proteinado',kind:'Proteinado',grams:250,price:5,protein:30,mode:'Simulação',gmd:0.60}],expenses:[{id:id(),name:'Manejo do pasto',kind:'Operacional',date:date(-20),value:350}],sale:{days:90,gmd:0.55,price:12,feed:feed.id,other:500}}
}
const empty = () => ({demo:false,animals:[],weights:[],pastures:[],feeds:[],expenses:[],sale:{days:90,gmd:0,price:0,feed:'',other:0}})
let data, version, busy=false, page
const nf = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2})
const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})
const num = v => v == null ? '—' : nf.format(v)
const money = v => v == null ? '—' : brl.format(v)
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmtDate = v => v ? v.split('-').reverse().join('/') : '—'
const sum = (rows,fn) => rows.reduce((a,b)=>a+fn(b),0)
const days = (a,b) => (Date.parse(b)-Date.parse(a))/86400000
const headDay = f => f.grams/1000*f.price
const endedDays = f => Math.max(0,days(f.start,f.end < iso ? f.end : iso)+1)
const feedCost = f => headDay(f)*f.heads*endedDays(f)
const history = a => data.weights.filter(w=>w.animal===a.id).sort((a,b)=>a.date.localeCompare(b.date))
const last = a => history(a).at(-1)?.kg
const name = (key,value) => {
 const row = data[key].find(r=>r.id===value)
 return row ? (key==='animals' ? row.tag+' · '+row.name : row.name) : '—'
}
const getMetrics = () => {
 const weighed = data.animals.filter(a=>last(a)!=null)
 const series = weighed.map(history).filter(h=>h.length>1)
 const gain = sum(series,h=>h.at(-1).kg-h[0].kg)
 const animalDays = sum(series,h=>days(h[0].date,h.at(-1).date))
 const totalWeight = sum(weighed,last)
 const food = sum(data.feeds.filter(f=>f.mode==='Registrado'),feedCost)+sum(data.expenses.filter(e=>e.kind==='Alimentar' && e.date<=iso),e=>e.value)
 const incurred = data.expenses.filter(e=>e.date<=iso)
 const operating = food+sum(incurred.filter(e=>e.kind==='Operacional'),e=>e.value)
 const individualAcquisition = sum(data.animals,a=>a.acquisition??0)
 const lotAcquisition = sum(incurred.filter(e=>e.kind==='Aquisição'),e=>e.value)
 const total = operating+individualAcquisition+lotAcquisition
 return {weighed,totalWeight,avg:weighed.length ? totalWeight/weighed.length : null,gmd:animalDays ? gain/animalDays : null,gain,food,operating,total,individualAcquisition,lotAcquisition,cpg:gain>0 ? operating/gain : null}
}
const btn = (text,action,key='',row='',primary=false) => '<button type="button" class="'+(primary?'primary':'')+'" data-action="'+action+'" data-key="'+key+'" data-id="'+esc(row)+'">'+text+'</button>'
const card = (label,value,detail='') => '<section class="card"><span class="muted">'+label+'</span><strong class="value">'+value+'</strong><small>'+detail+'</small></section>'
const grid = (cards,wide=false) => '<div class="grid'+(wide?' wide':'')+'">'+cards.join('')+'</div>'
const table = (key,title,extra=[],rows=data[key]) => {
 const cols = schema[key]
 const cell = (field,value) => field==='date' ? fmtDate(value) : ['animals','pastures','feeds'].includes(field) ? name(field,value) : field==='number' ? num(value) : value
 return '<section class="card"><div class="toolbar"><h2>'+title+'</h2>'+btn('Adicionar','edit',key,'',true)+'</div><div class="table"><table><thead><tr>'+[...cols.map(c=>c[1]),...extra.map(c=>c[0]),'Ações'].map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(([k,l,t])=>'<td>'+esc(cell(t,r[k]))+'</td>').join('')+extra.map(([,fn])=>'<td>'+esc(fn(r))+'</td>').join('')+'<td>'+btn('Editar','edit',key,r.id)+' '+btn('Excluir','delete',key,r.id)+'</td></tr>').join('')+'</tbody></table></div>'+(rows.length?'':'<p class="muted">Nenhum registro.</p>')+'</section>'
}
const pastureMetrics = p => {
 const lot = data.animals.filter(a=>a.pasture===p.id)
 const known = lot.filter(a=>last(a)!=null)
 const ua = sum(known,last)/450
 return {lot,known,ua,density:ua/p.area}
}
const bar = (title,value,max,display) => '<div class="bar"><span>'+esc(title)+'</span><meter min="0" max="'+(max||1)+'" value="'+value+'"></meter><strong>'+esc(display)+'</strong></div>'
function dashboard(m) {
 const pastureRows = data.pastures.map(p=>[p,pastureMetrics(p)])
 const max = Math.max(1,...pastureRows.map(([,v])=>v.density))
 return '<div class="dashboard-kpis">'+grid([card('Animais cadastrados',num(data.animals.length),'<a href="#animals">Ver animais →</a>'),card('Peso médio',num(m.avg)+(m.avg==null?'':' kg'),m.weighed.length+' com pesagem'),card('GMD do lote',num(m.gmd)+(m.gmd==null?'':' kg/dia'),'Ganho ÷ dias-animal'),card('Custo total',money(m.total),'Inclui aquisição')])+'</div>'+
 grid(['<section class="card"><h2>Evolução do peso médio</h2><canvas id="trend" role="img" aria-label="Evolução do peso médio por data de pesagem"></canvas><p class="muted" id="chart-detail"></p></section>',
 '<section class="card"><h2>Lotação por pasto</h2>'+ (pastureRows.map(([p,v])=>bar(p.name,v.density,max,num(v.density)+' UA/ha'+(v.known.length<v.lot.length?'*':''))).join('')||'<p class="muted">Cadastre um pasto para acompanhar a lotação.</p>')+'<small>1 UA = 450 kg de peso vivo. * Lotação parcial, há animais sem pesagem.</small></section>'],true)+
 grid([card('Custo alimentar',money(m.food),'Suplementação estimada e despesas alimentares'),card('Custo operacional por kg ganho',money(m.cpg),'Exclui aquisição do lote'),card('Ganho acumulado medido',num(m.gain)+' kg','Animais com duas ou mais pesagens')])+
 '<section class="card"><h2>Pesagens recentes</h2><div class="table"><table><thead><tr><th>Animal</th><th>Data</th><th>Peso vivo</th></tr></thead><tbody>'+[...data.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(w=>'<tr><td>'+esc(name('animals',w.animal))+'</td><td>'+fmtDate(w.date)+'</td><td>'+num(w.kg)+' kg</td></tr>').join('')+'</tbody></table></div></section>'
}
function sale(m) {
 const s=data.sale, f=data.feeds.find(f=>f.id===s.feed), heads=data.animals.length
 const complete=heads>0 && m.weighed.length===heads
 const currentFeed = f ? headDay(f)*heads*s.days : 0
 const weight=complete ? m.avg+s.gmd*s.days : null
 const revenue=complete ? weight*heads*s.price : null
 const cost=m.total+currentFeed+s.other
 const forecasts=data.feeds.map(f=>{
  const gain=f.gmd*s.days*heads, cost=headDay(f)*s.days*heads
  return '<tr><td>'+esc(f.name)+'</td><td>'+num(f.grams)+' g</td><td>'+num(f.gmd)+'</td><td>'+num(gain)+' kg</td><td>'+money(cost)+'</td><td>'+money(gain>0?cost/gain:null)+'</td><td>'+money(gain*s.price-cost)+'</td></tr>'
 })
 return '<div class="toolbar"><span>'+s.days+' dias · '+num(s.gmd)+' kg/dia · '+money(s.price)+'/kg vivo · '+esc(f?.name||'Sem suplemento projetado')+'</span>'+btn('Editar projeção','edit','sale','',true)+'</div>'+
 (!complete?'<p class="notice">Registre o peso de todos os animais para projetar receita e margem.</p>':'')+
 grid([card('Peso na venda por cabeça',weight==null?'—':num(weight)+' kg'),card('Receita do lote',money(revenue)),card('Custo total projetado',money(cost),'Acumulado + suplemento + outros futuros'),card('Resultado projetado',money(revenue==null?null:revenue-cost))])+
 '<section class="card"><h2>Mineral e proteinado</h2><p class="muted">Cenários em '+s.days+' dias para '+heads+' cabeças. O saldo incremental considera apenas o valor do ganho projetado e o custo do suplemento.</p><div class="table"><table><thead><tr><th>Produto</th><th>Por cabeça/dia</th><th>GMD assumido</th><th>Ganho do lote</th><th>Custo do lote</th><th>Suplemento/kg ganho</th><th>Saldo incremental</th></tr></thead><tbody>'+forecasts.join('')+'</tbody></table></div></section>'
}
function draw() {
 const canvas=$('trend')
 if (!canvas) return
 const byDate=Map.groupBy(data.weights,w=>w.date)
 const points=[...byDate].sort(([a],[b])=>a.localeCompare(b)).map(([d,w])=>[d,sum(w,x=>x.kg)/w.length,w.length])
 $('chart-detail').textContent=points.length ? points.map(([d,v,n])=>fmtDate(d)+' · '+num(v)+' kg ('+n+')').join('  |  ') : 'Sem pesagens registradas.'
 const w=canvas.clientWidth,h=180,dpr=devicePixelRatio
 canvas.width=w*dpr; canvas.height=h*dpr
 const c=canvas.getContext('2d'); c.scale(dpr,dpr); c.font='11px system-ui'
 if (!points.length) return
 const min=Math.min(...points.map(p=>p[1]))-5,max=Math.max(...points.map(p=>p[1]))+5
 const top=10,bottom=150,left=42,right=w-12
 for(let i=0;i<4;i++){
  const y=top+(bottom-top)*i/3
  c.strokeStyle='#e2cdb6';c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke()
  c.fillStyle='#694e3e';c.fillText(num(max-(max-min)*i/3),0,y+4)
 }
 const span=days(points[0][0],points.at(-1)[0])
 const coords=points.map(([d,v])=>[span ? left+(right-left)*days(points[0][0],d)/span : (left+right)/2,bottom-(bottom-top)*(v-min)/(max-min)])
 c.strokeStyle='#895c40';c.lineWidth=3;c.beginPath()
 coords.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()
 for(const [x,y] of coords){c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fillStyle='#895c40';c.fill()}
 c.fillStyle='#694e3e'; c.fillText(fmtDate(points[0][0]),left,172)
 if(span){c.textAlign='right'; c.fillText(fmtDate(points.at(-1)[0]),right,172)}
}
function render() {
 page=location.hash.slice(1)
 if(!Object.hasOwn(pages,page)) page='dashboard'
 $('title').textContent=page==='dashboard'?'Seu rebanho, em perspectiva.':pages[page]
 $('breadcrumb').textContent='Painel / '+pages[page]
 $('subtitle').textContent=page==='dashboard'?'Pesagens, lotação e custos da recria em um só lugar.':''
 $('nav').innerHTML=Object.entries(pages).map(([k,v])=>'<a href="#'+k+'" '+(k===page?'aria-current="page"':'')+'>'+v+'</a>').join('')
 $('notice').innerHTML=data.demo?'<div class="notice toolbar"><span><strong>Dados de exemplo.</strong> A demonstração começa com 13 novilhas. Pesos, área, consumo e valores são simulados.</span>'+btn('Começar meus registros','reset')+'</div>':''
 const m=getMetrics()
 const views={
  dashboard:()=>dashboard(m),
  animals:()=>table('animals','Cadastro do lote',[['Último peso',a=>last(a)==null?'—':num(last(a))+' kg'],['GMD (kg/dia)',a=>{const h=history(a);return h.length<2?'—':num((h.at(-1).kg-h[0].kg)/days(h[0].date,h.at(-1).date))}]] )+table('weights','Histórico de pesagens',[],[...data.weights].sort((a,b)=>b.date.localeCompare(a.date))),
  pastures:()=>'<p class="muted">UA = peso vivo medido ÷ 450 kg. UA/ha = UA ÷ área.</p>'+table('pastures','Áreas de pastejo',[['Cabeças',p=>pastureMetrics(p).lot.length],['Pesadas',p=>pastureMetrics(p).known.length],['UA',p=>num(pastureMetrics(p).ua)],['UA/ha',p=>num(pastureMetrics(p).density)]]),
  feeds:()=>'<p class="muted">Consumo e proteína são entradas editáveis. Use o rótulo do seu produto para preencher os dados. O custo registrado considera os dias corridos até hoje.</p>'+table('feeds','Manejo e cenários',[['kg/lote/dia',f=>num(f.grams*f.heads/1000)],['R$/cabeça/dia',f=>money(headDay(f))],['R$/lote/dia',f=>money(headDay(f)*f.heads)],['Custo do período',f=>money(f.mode==='Registrado'?feedCost(f):headDay(f)*f.heads*(days(f.start,f.end)+1))]]),
  expenses:()=>costs(m),
  sale:()=>sale(m),
  bi:()=>bi(m)
 }
 $('content').innerHTML=(['dashboard','bi'].includes(page)?'':analytics(page,m))+views[page]()
 draw()
}
function chart(title, rows, format=num) {
 const max=Math.max(1,...rows.map(([,v])=>Math.abs(v)))
 return '<section class="card"><h2>'+title+'</h2>'+
 (rows.map(([label,value])=>bar(label,Math.abs(value),max,format(value))).join('')||'<p class="muted">Sem registros para exibir.</p>')+'</section>'
}
function analytics(section,m) {
 const heads=data.animals.length
 const current=data.feeds.filter(f=>f.mode==='Registrado'&&f.start<=iso&&f.end>=iso)
 const scenarios=data.feeds.filter(f=>f.mode==='Simulação')
 const s=data.sale
 const feed=data.feeds.find(f=>f.id===s.feed)
 const futureFeed=feed?headDay(feed)*s.days*heads:0
 const ready=heads>0&&m.weighed.length===heads
 const rows={
  animals:()=>grid([card('Animais cadastrados',num(heads)),card('Aguardam pesagem',num(heads-m.weighed.length)),card('Pesagens registradas',num(data.weights.length))])+chart('Peso mais recente por animal (kg)',m.weighed.map(a=>[a.tag+' · '+a.name,last(a)])),
  pastures:()=>grid([card('Área cadastrada',num(sum(data.pastures,p=>p.area))+' ha'),card('Animais alocados',num(data.animals.filter(a=>a.pasture).length)),card('Sem pasto atribuído',num(data.animals.filter(a=>!a.pasture).length))])+chart('Lotação por pasto (UA/ha)',data.pastures.map(p=>[p.name,pastureMetrics(p).density])),
  feeds:()=>grid([card('Períodos ativos',num(current.length)),card('Consumo ativo do lote',num(sum(current,f=>f.grams*f.heads/1000))+' kg/dia'),card('Cenários',num(scenarios.length))])+chart('Custo diário por cabeça e por produto',data.feeds.map(f=>[f.name+' · '+f.mode,headDay(f)]),money),
  expenses:()=>chart('Composição do custo acumulado',[['Alimentação',m.food],['Operacional sem alimentação',m.operating-m.food],['Aquisição individual',m.individualAcquisition],['Aquisição do lote',m.lotAcquisition]],money),
  sale:()=>chart('Receita e custos projetados',[
   ...(ready?[['Receita',heads*(m.avg+s.days*s.gmd)*s.price]]:[]),
   ['Custos acumulados',m.total],['Suplementação futura',futureFeed],['Outros custos futuros',s.other]
  ],money)
 }
 return rows[section]()
}
const datasets={
 animals:'animais',weights:'pesagens',pastures:'pastos',feeds:'suplementos',expenses:'despesas',sale:'projecao'
}
let reportPasture=''
let reportPeriod='all'
function report() {
 const animals=data.animals.filter(a=>!reportPasture||a.pasture===reportPasture)
 const scope=Map.groupBy(animals,a=>a.id)
 const start=reportPeriod==='all'?'':date(1-Number(reportPeriod))
 const weights=data.weights.filter(w=>scope.has(w.animal)&&w.date>=start)
 const histories=Map.groupBy(weights,w=>w.animal)
 const rows=animals.map(a=>{
  const recorded=(histories.get(a.id)||[]).sort((x,y)=>x.date.localeCompare(y.date))
  const first=recorded[0], recent=recorded.at(-1)
  const interval=first&&recent?days(first.date,recent.date):0
  return {animal:a,weight:recent?.kg,gain:interval?recent.kg-first.kg:0,interval}
 })
 const known=rows.filter(r=>r.weight!=null)
 const animalDays=sum(rows,r=>r.interval)
 const mean=known.length?sum(known,r=>r.weight)/known.length:null
 const trend=[...Map.groupBy(weights,w=>w.date)].sort(([a],[b])=>a.localeCompare(b)).map(([d,w])=>[d,sum(w,x=>x.kg)/w.length,w.length])
 const max=Math.max(1,...trend.map(([,v])=>v))
 const evolution='<section class="card report-trend"><h2>Evolução do peso médio</h2><small>kg por dia de pesagem · escala a partir de zero</small>'+
 (trend.length?'<div class="report-plot" role="list" aria-label="Peso médio por data">'+trend.map(([d,value,count])=>'<div class="report-column" role="listitem" aria-label="'+fmtDate(d)+', '+num(value)+' kg, '+count+' pesagens"><strong>'+num(value)+'</strong><meter min="0" max="'+max+'" value="'+value+'"></meter><small>'+fmtDate(d)+'</small></div>').join('')+'</div>':'<p class="muted">Sem pesagens no período.</p>')+'</section>'
 const ranking=(title,items,format,theme)=>'<div class="report-ranking '+theme+'">'+chart(title,items.sort((a,b)=>b[1]-a[1]).slice(0,8),format)+'</div>'
 const detail='<section class="card report-detail"><h2>Detalhe por animal</h2><div class="table"><table><thead><tr><th>Brinco</th><th>Animal</th><th>Último peso no período</th><th>GMD no período</th><th>Aquisição</th></tr></thead><tbody>'+
 rows.map(({animal:a,weight,gain,interval})=>'<tr><td>'+esc(a.tag)+'</td><td>'+esc(a.name)+'</td><td>'+num(weight)+'</td><td>'+num(interval?gain/interval:null)+'</td><td>'+money(a.acquisition)+'</td></tr>').join('')+'</tbody></table></div></section>'
 const filters='<form class="report-filters" aria-label="Filtros do resumo"><strong>Filtros do resumo</strong><label>Período de pesagem<select id="report-period">'+[['all','Todo o histórico'],['30','Últimos 30 dias'],['90','Últimos 90 dias'],['365','Últimos 365 dias']].map(([key,label])=>'<option value="'+key+'" '+(key===reportPeriod?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Pasto atual<select id="report-pasture"><option value="">Todos os pastos</option>'+data.pastures.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===reportPasture?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label><small>O período filtra as pesagens. A aquisição usa os valores cadastrados por animal.</small></form>'
 return '<div class="report-layout">'+filters+'<div class="report-main"><div class="report-kpis">'+grid([
  card('Animais no recorte',num(animals.length),'Pasto atual'),
  card('Peso médio',mean==null?'—':num(mean)+' kg',known.length+' animais pesados'),
  card('GMD do lote',animalDays?num(sum(rows,r=>r.gain)/animalDays)+' kg/dia':'—',weights.length+' pesagens no período'),
  card('Aquisição individual',money(sum(animals,a=>a.acquisition??0)),animals.filter(a=>a.acquisition!=null).length+' valores informados')
 ])+'</div><div class="report-charts"><div>'+evolution+detail+'</div>'+
 ranking('Maiores pesos (kg)',known.map(r=>[r.animal.tag+' · '+r.animal.name,r.weight]),num,'report-blue')+
 ranking('Maiores aquisições',animals.filter(a=>a.acquisition!=null).map(a=>[a.tag+' · '+a.name,a.acquisition]),money,'report-pink')+
 '</div></div></div>'
}
function bi(m) {
 const panel=(key,title,body)=>'<section class="bi-panel bi-'+key+'" aria-labelledby="bi-'+key+'"><h2 id="bi-'+key+'">'+title+'</h2>'+body+'</section>'
 return '<nav class="bi-jump" aria-label="Painéis desta aba">'+[['overview','Resumo'],['animals','Rebanho'],['pastures','Pastagens'],['feeds','Suplementação'],['expenses','Custos'],['sale','Venda']].map(([key,label])=>btn(label,'jump',key)).join('')+'</nav>'+
 panel('overview','Resumo da fazenda',report())+
 panel('animals','Rebanho e pesagens',analytics('animals',m)+table('animals','Cadastro do lote')+table('weights','Histórico de pesagens'))+
 panel('pastures','Pastagens',analytics('pastures',m)+table('pastures','Áreas de pastejo',[['UA/ha',p=>num(pastureMetrics(p).density)]]))+
 panel('feeds','Suplementação',analytics('feeds',m)+table('feeds','Manejo e cenários',[['Custo diário por cabeça',f=>money(headDay(f))]]))+
 panel('expenses','Custos e aquisição',analytics('expenses',m)+costs(m))+
 panel('sale','Projeção de venda',analytics('sale',m)+sale(m))+
 '<section class="card bi-export"><h2>Dados para Power BI</h2><p class="muted">Exporte uma tabela por vez. No Power BI Desktop, use Obter dados → Texto/CSV e selecione ponto e vírgula e localidade Português (Brasil). Importe IDs e brincos como texto.</p><div class="export-actions">'+Object.entries(datasets).map(([key,label])=>btn('CSV · '+label,'export',key)).join('')+'</div></section>'
}
function exportData(key) {
 const records=key==='sale'?[data.sale]:data[key]
 const fields=key==='sale'?schema.sale.map(([field])=>field):['id',...schema[key].map(([field])=>field),...(key==='animals'?['acquisition']:[])]
 const csvCell=value=>{
  if(typeof value==='number')return String(value).replace('.',',')
  const raw=String(value??'')
  const safe=/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw
  return '"'+safe.replaceAll('"','""')+'"'
 }
 const csv=[['demo',...fields].join(';'),...records.map(record=>[data.demo?'sim':'não',...fields.map(field=>csvCell(record[field]))].join(';'))].join('\r\n')
 const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}))
 const link=document.createElement('a')
 link.href=url
 link.download=datasets[key]+'.csv'
 link.click()
 setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function costs(m) {
 const rows=data.animals.map(a=>'<tr><td>'+esc(a.tag)+'</td><td>'+esc(a.name)+'</td><td>'+esc(money(a.acquisition))+'</td><td>'+btn(a.acquisition==null?'Informar valor':'Editar valor','edit','acquisition',a.id)+'</td></tr>').join('')
 const note=m.lotAcquisition ? '<p class="notice">Há '+money(m.lotAcquisition)+' em despesas de aquisição do lote. Se um lançamento corresponder a valores já detalhados por animal, ajuste a despesa para evitar contagem em dobro.</p>' : ''
 return grid([card('Alimentar',money(m.food)),card('Operacional com alimentação',money(m.operating)),card('Aquisição individual',money(m.individualAcquisition)),card('Total com aquisição',money(m.total)),card('Custo por kg ganho',money(m.cpg),'Operacional ÷ ganho acumulado medido')])+
 '<section class="card"><h2>Aquisição por animal</h2>'+note+(rows?'<div class="table"><table><thead><tr><th scope="col">Brinco</th><th scope="col">Animal</th><th scope="col">Valor de aquisição</th><th scope="col">Ações</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p class="muted">Cadastre os animais para informar o valor de aquisição.</p>')+'</section>'+
 table('expenses','Despesas')
}
function edit(key,row) {
 const collection=key==='acquisition'?'animals':key
 const record=key==='sale'?data.sale:data[collection].find(r=>r.id===row)||{}
 const heading=key==='acquisition'?'Aquisição · '+esc(record.tag)+' · '+esc(record.name):((row||key==='sale')?'Editar ':'Adicionar ')+labels[key].toLowerCase()
 $('form').innerHTML='<h2>'+heading+'</h2><div class="fields">'+schema[key].map(([k,label,type,min=0,max,step='any'])=>{
  const choices=Array.isArray(type)?type.map(x=>[x,x]):['animals','pastures','feeds'].includes(type)?data[type].map(x=>[x.id,name(type,x.id)]):null
  const v=record[k]??(type==='date'?iso:(type==='number'&&min===0&&key!=='acquisition'?0:''))
  const optional=key==='acquisition'||(key==='animals'&&k==='pasture')||(key==='sale'&&k==='feed')
  const input=choices?'<select name="'+k+'" '+(optional?'':'required')+'><option value="">'+(optional?'Nenhum':'Selecione')+'</option>'+choices.map(([x,t])=>'<option value="'+esc(x)+'" '+(v===x?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select>':
  '<input '+(optional?'':'required')+' name="'+k+'" type="'+(type||'text')+'" value="'+esc(v)+'" '+(type==='number'?'min="'+min+'" step="'+step+'" '+(max?'max="'+max+'"':''):'maxlength="120"')+'>'
  return '<label>'+label+input+'</label>'
 }).join('')+'</div><p id="form-error" class="error" role="alert"></p><div class="actions">'+btn('Cancelar','cancel')+'<button class="primary">Salvar</button></div>'
 $('form').onsubmit=async e=>{
  e.preventDefault()
  if(busy)return
  const values=Object.fromEntries(new FormData(e.target))
  for(const [k,,t] of schema[key]) values[k]=t==='number'?Number(values[k]):values[k].trim()
  const error=$('form-error')
  if(Object.values(values).some(v=>v==null||(typeof v==='number'&&!Number.isFinite(v))) || schema[key].some(([k,,t])=>!t&&!values[k])){error.textContent='Preencha todos os campos obrigatórios.';return}
  if(key==='weights' && (values.date>iso || data.weights.some(w=>w.id!==row&&w.animal===values.animal&&w.date===values.date))){error.textContent='Use uma data até hoje e apenas uma pesagem por animal por dia.';return}
  if(key==='animals' && data.animals.some(a=>a.id!==row&&a.tag.toLowerCase()===values.tag.toLowerCase())){error.textContent='Este brinco já está cadastrado.';return}
  if(key==='feeds' && values.end<values.start){error.textContent='A data final deve ser igual ou posterior à inicial.';return}
  const next=structuredClone(data)
  if(key==='sale') next.sale=values
  else if(key==='acquisition'){
   const animal=next.animals.find(a=>a.id===row)
   if(new FormData(e.target).get('acquisition')==='') delete animal.acquisition
   else animal.acquisition=values.acquisition
  }
  else if(row) next[key][next[key].findIndex(r=>r.id===row)]={...record,...values}
  else next[key].push({id:id(),...values})
  if(await save(next)) $('editor').close()
  else error.textContent=$('status').textContent
 }
 $('editor').showModal()
}
async function save(next) {
 if(busy)return false
 busy=true
 $('status').textContent='Salvando…'
 try {
  const res=await fetch('/api/registros',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,data:next})})
  if(!res.ok) throw Error(res.status===409?'Outra sessão salvou alterações. Recarregue a página antes de tentar novamente.':'Falha ao salvar. Tente novamente.')
  const result=await res.json()
  version=result.version;data=result.data
  $('status').textContent='Alterações salvas'
  render()
  return true
 } catch(e){$('status').textContent=e.message;return false}
 finally{busy=false}
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button[data-action]')
 if(!b||busy)return
 const {action,key,id:row}=b.dataset
 if(action==='cancel') $('editor').close()
 if(action==='edit') edit(key,row)
 if(action==='export'&&Object.hasOwn(datasets,key)) exportData(key)
 if(action==='jump') $('bi-'+key)?.scrollIntoView({block:'start'})
 if(action==='reset'&&confirm('Excluir todos os registros da demonstração e começar com um cadastro vazio?')) await save(empty())
 if(action==='delete'){
  if(key==='animals'&&data.weights.some(w=>w.animal===row)){alert('Exclua as pesagens deste animal antes de excluir o cadastro.');return}
  if(!confirm('Excluir este registro?'))return
  const next=structuredClone(data)
  next[key]=next[key].filter(r=>r.id!==row)
  if(key==='pastures') next.animals.forEach(a=>{if(a.pasture===row)a.pasture=''})
  if(key==='feeds'&&next.sale.feed===row)next.sale.feed=''
  await save(next)
 }
})
addEventListener('hashchange',()=>{if(data)render()})
addEventListener('resize',draw)
document.addEventListener('change',e=>{
 if(e.target.id!=='report-period'&&e.target.id!=='report-pasture')return
 reportPeriod=$('report-period').value
 reportPasture=$('report-pasture').value
 const field=e.target.id
 render()
 $(field).focus({preventScroll:true})
})
$('lookup').addEventListener('submit',e=>{
 e.preventDefault()
 if(!data)return
 const tag=$('tag').value.trim().toLowerCase()
 const animal=data.animals.find(a=>a.tag.toLowerCase()===tag)
 $('lookup-result').textContent=animal?'':'Brinco não encontrado.'
 if(animal)edit('animals',animal.id)
})
try {
 const res=await fetch('/api/registros')
 if(!res.ok)throw Error()
 const record=await res.json()
 version=record.version;data=record.data||seed()
 $('status').textContent=record.data?'Registros carregados':'Demonstração'
 render()
} catch { $('status').textContent='Falha ao carregar os registros. Recarregue a página.' }

