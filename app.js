(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const config = window.BIMO_CONFIG || {};
  const hasSupabaseConfig = !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  const supabase = hasSupabaseConfig && window.supabase
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    : null;

  const demoKey = "bimo_demo_data_v1";
  const defaultProfile = {name:"Meu negócio", profession:"Profissional", phone:"", contact:"", description:""};
  let state = {profile:{...defaultProfile}, clients:[], appointments:[], services:[], orders:[], transactions:[]};
  let currentUser = null;
  let activeModal = null;
  let editingId = null;

  const money = n => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(n||0));
  const dateBR = value => value ? new Date(value+"T00:00:00").toLocaleDateString("pt-BR") : "—";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()));
  const toast = message => { const el=$("#toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); };
  const today = () => new Date().toISOString().slice(0,10);
  const isOverdue = t => t.status !== "paid" && t.due_date && Math.floor((new Date(today()+"T00:00:00")-new Date(t.due_date+"T00:00:00"))/86400000) > 30;
  const allDemo = () => { try { return JSON.parse(localStorage.getItem(demoKey)) || null; } catch { return null; } };
  const saveDemo = () => localStorage.setItem(demoKey, JSON.stringify(state));

  function setAuthTab(tab){
    $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));
    $("#loginForm").classList.toggle("hidden",tab!=="login");
    $("#signupForm").classList.toggle("hidden",tab!=="signup");
  }
  $$("[data-auth-tab]").forEach(b=>b.addEventListener("click",()=>setAuthTab(b.dataset.authTab)));
  $("#authConfigNotice").classList.toggle("hidden",hasSupabaseConfig);
  $("#demoButton").addEventListener("click",()=>{state=allDemo()||state; showApp({name:state.profile.name||"Meu negócio",email:"Demonstração"});});
  $("#loginForm").addEventListener("submit", async e=>{
    e.preventDefault();
    if(!supabase) return toast("Configure o Supabase ou entre pela demonstração.");
    const {data,error}=await supabase.auth.signInWithPassword({email:$("#loginEmail").value,password:$("#loginPassword").value});
    if(error) return toast(error.message);
    currentUser=data.user; await loadRemote(); showApp(data.user);
  });
  $("#signupForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!supabase) return toast("Configure o Supabase antes de criar uma conta real.");
    const name=$("#signupName").value.trim(), profession=$("#signupProfession").value.trim();
    const {data,error}=await supabase.auth.signUp({email:$("#signupEmail").value,password:$("#signupPassword").value,options:{data:{full_name:name,profession}}});
    if(error) return toast(error.message);
    if(data.user){currentUser=data.user;state.profile={...defaultProfile,name,profession};await saveRemoteProfile();showApp(data.user);toast("Conta criada. Verifique seu e-mail se a confirmação estiver ativada.");}
  });
  $("#forgotPassword").addEventListener("click",async()=>{
    if(!supabase) return toast("A recuperação de senha estará disponível após configurar o Supabase.");
    const email=$("#loginEmail").value.trim(); if(!email) return toast("Digite seu e-mail primeiro.");
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.href});
    toast(error?error.message:"Enviamos as instruções para seu e-mail.");
  });
  $("#logoutButton").addEventListener("click",async()=>{if(supabase) await supabase.auth.signOut();currentUser=null;$("#appView").classList.add("hidden");$("#authView").classList.remove("hidden");});
  $("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $$(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
  $$("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
  $$("[data-open-modal]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.openModal)));
  $("#closeModal").addEventListener("click",closeModal);$("#cancelModal").addEventListener("click",closeModal);
  $("#itemForm").addEventListener("submit",saveModal);
  $("#settingsForm").addEventListener("submit",async e=>{e.preventDefault();state.profile={...state.profile,name:$("#settingsName").value.trim(),profession:$("#settingsProfession").value.trim(),phone:$("#settingsPhone").value.trim(),contact:$("#settingsContact").value.trim(),description:$("#settingsDescription").value.trim()};await persist();updateIdentity();toast("Informações salvas.");});

  function showApp(user){
    $("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");
    $("#connectionStatus").textContent=supabase?"Conectado ao Supabase":"Modo demonstração";
    $("#planStatus").textContent="Demonstração / configurar";
    updateIdentity();render();navigate("overview");
  }
  function updateIdentity(){
    const name=state.profile.name||"Meu negócio", profession=state.profile.profession||"Profissional";
    const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    $("#sideUserName").textContent=name;$("#sideProfession").textContent=profession;$("#avatarInitials").textContent=initials;$("#topAvatar").textContent=initials;$("#welcomeName").textContent=name;
    $("#settingsName").value=name;$("#settingsProfession").value=profession;$("#settingsPhone").value=state.profile.phone||"";$("#settingsContact").value=state.profile.contact||"";$("#settingsDescription").value=state.profile.description||"";
    $("#todayLabel").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"}).toUpperCase();
  }
  function navigate(page){
    $$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const titles={overview:"Visão geral",clients:"Clientes",appointments:"Agenda",services:"Serviços e produtos",orders:"Ordens de serviço",finance:"Financeiro",reports:"Relatórios",settings:"Meu negócio"};
    $("#pageTitle").textContent=titles[page]||"BIMO";$("#sidebar").classList.remove("open");
  }
  async function loadRemote(){
    if(!supabase||!currentUser)return;
    const tables=["clients","appointments","services","orders","transactions"];
    for(const table of tables){const {data,error}=await supabase.from(table).select("*").order("created_at",{ascending:false});if(!error)state[table]=data||[];}
    const {data:profile}=await supabase.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();
    if(profile)state.profile={name:profile.business_name||profile.full_name||"Meu negócio",profession:profile.profession||"Profissional",phone:profile.phone||"",contact:profile.contact_email||"",description:profile.description||""};
  }
  async function persist(){
    if(!supabase||!currentUser){saveDemo();render();return;}
    await saveRemoteProfile();render();
  }
  async function saveRemoteProfile(){
    if(!supabase||!currentUser)return;
    const p=state.profile;
    const {error}=await supabase.from("profiles").upsert({id:currentUser.id,full_name:p.name,business_name:p.name,profession:p.profession,phone:p.phone,contact_email:p.contact,description:p.description});
    if(error)toast("Não foi possível salvar o perfil: "+error.message);
  }
  async function insertRemote(table,row){
    if(!supabase||!currentUser){state[table].unshift(row);saveDemo();return;}
    const {data,error}=await supabase.from(table).insert({...row,user_id:currentUser.id}).select().single();
    if(error)throw error;state[table].unshift(data);
  }
  async function updateRemote(table,id,changes){
    if(!supabase||!currentUser){state[table]=state[table].map(x=>x.id===id?{...x,...changes}:x);saveDemo();return;}
    const {error}=await supabase.from(table).update(changes).eq("id",id);if(error)throw error;
    state[table]=state[table].map(x=>x.id===id?{...x,...changes}:x);
  }
  function render(){
    const clients=state.clients, appointments=state.appointments, transactions=state.transactions;
    const month=new Date().toISOString().slice(0,7);
    const income=transactions.filter(t=>t.kind==="income"&&t.status==="paid"&&(t.paid_at||t.created_at||"").slice(0,7)===month).reduce((s,t)=>s+Number(t.amount||0),0);
    const expenses=transactions.filter(t=>t.kind==="expense"&&t.status==="paid").reduce((s,t)=>s+Number(t.amount||0),0);
    const pending=transactions.filter(t=>t.kind==="income"&&t.status!=="paid").reduce((s,t)=>s+Number(t.amount||0),0);
    const overdue=transactions.filter(t=>t.kind==="income"&&isOverdue(t));
    const overdueValue=overdue.reduce((s,t)=>s+Number(t.amount||0),0);
    $("#statClients").textContent=clients.length;$("#statAppointments").textContent=appointments.filter(a=>a.date===today()&&a.status!=="cancelled").length;$("#statIncome").textContent=money(income);$("#statOverdue").textContent=money(overdueValue);$("#statOverdueCount").textContent=overdue.length+" cobranças críticas";
    $("#financeIncome").textContent=money(income);$("#financeExpenses").textContent=money(expenses);$("#financePending").textContent=money(pending);
    $("#reportClients").textContent=clients.length;$("#reportOrders").textContent=state.orders.filter(o=>o.status==="completed").length;$("#reportIncome").textContent=money(income);$("#reportDebt").textContent=money(overdueValue);
    $("#reportSummary").textContent=`Você tem ${clients.length} clientes, ${appointments.length} compromissos registrados e ${money(pending)} em valores a receber.`;
    $("#upcomingList").innerHTML=appointments.filter(a=>a.status!=="cancelled").sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5).map(a=>`<div class="list-row"><strong>${esc(a.client_name)}</strong><span>${dateBR(a.date)} • ${esc(a.time||"")}</span></div>`).join("")||"Nenhum compromisso cadastrado.";
    $("#overdueList").innerHTML=overdue.slice(0,5).map(t=>`<div class="list-row"><strong>${esc(t.description)}</strong><span>${money(t.amount)} • ${Math.floor((new Date(today())-new Date(t.due_date))/86400000)} dias</span></div>`).join("")||"Nenhuma cobrança crítica.";
    $("#clientsTable").innerHTML=clients.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.phone||"—")}</td><td>${esc(c.notes||"—")}</td><td><button class="text-btn" data-delete="clients" data-id="${c.id}">Excluir</button></td></tr>`).join("");
    $("#appointmentsTable").innerHTML=appointments.map(a=>`<tr><td>${dateBR(a.date)} ${esc(a.time||"")}</td><td>${esc(a.client_name)}</td><td>${esc(a.subject||"—")}</td><td><span class="status">${esc(a.status||"scheduled")}</span></td><td><button class="text-btn" data-delete="appointments" data-id="${a.id}">Excluir</button></td></tr>`).join("");
    $("#servicesGrid").innerHTML=state.services.map(s=>`<article class="service-card"><strong>${esc(s.name)}</strong><p class="muted">${esc(s.description||"")}</p><div class="price">${money(s.price)}</div><button class="text-btn" data-delete="services" data-id="${s.id}">Excluir</button></article>`).join("");
    $("#ordersTable").innerHTML=state.orders.map(o=>`<tr><td>#${esc(o.order_number||"—")}</td><td>${esc(o.client_name)}</td><td>${esc(o.description)}</td><td>${dateBR(o.due_date)}</td><td><span class="status">${esc(o.status||"open")}</span></td></tr>`).join("");
    $("#financeTable").innerHTML=transactions.map(t=>`<tr><td>${esc(t.description)}</td><td>${esc(t.client_name||"—")}</td><td>${dateBR(t.due_date)}</td><td>${money(t.amount)}</td><td><span class="status ${isOverdue(t)?"danger":t.status==="paid"?"":"warning"}">${isOverdue(t)?"Crítico (+30 dias)":t.status==="paid"?"Pago":"Pendente"}</span></td><td>${t.kind==="income"&&t.status!=="paid"?`<button class="text-btn" data-paid="${t.id}">Marcar pago</button>`:""}</td></tr>`).join("");
    ["clients","appointments","services","orders","finance"].forEach(key=>{const ids={clients:"clientsEmpty",appointments:"appointmentsEmpty",services:"servicesEmpty",orders:"ordersEmpty",finance:"financeEmpty"};const empty=$("#"+ids[key]);if(empty)empty.style.display=state[key].length?"none":"block";});
    $$("[data-delete]").forEach(b=>b.addEventListener("click",()=>removeItem(b.dataset.delete,b.dataset.id)));
    $$("[data-paid]").forEach(b=>b.addEventListener("click",()=>markPaid(b.dataset.paid)));
  }
  async function removeItem(table,id){
    if(!confirm("Deseja excluir este registro?"))return;
    if(supabase&&currentUser){const {error}=await supabase.from(table).delete().eq("id",id);if(error)return toast(error.message);}
    state[table]=state[table].filter(x=>String(x.id)!==String(id));await persist();toast("Registro excluído.");
  }
  async function markPaid(id){const item=state.transactions.find(t=>String(t.id)===String(id));if(!item)return;try{await updateRemote("transactions",id,{status:"paid",paid_at:new Date().toISOString()});await persist();toast("Pagamento registrado.");}catch(e){toast(e.message);}}
  const fields={
    client:[["name","Nome do cliente","text",true],["phone","Telefone","tel",false],["email","E-mail","email",false],["notes","Observações","textarea",false]],
    appointment:[["client_name","Nome do cliente","text",true],["date","Data","date",true],["time","Horário","time",true],["subject","Serviço / assunto","text",true],["status","Status","select",true,["scheduled","confirmed","completed","cancelled"]]],
    service:[["name","Nome do serviço ou produto","text",true],["description","Descrição","textarea",false],["price","Preço (R$)","number",true]],
    order:[["client_name","Nome do cliente","text",true],["description","Defeito / trabalho / descrição","textarea",true],["budget","Orçamento (R$)","number",false],["due_date","Prazo","date",false],["status","Status","select",true,["open","in_progress","waiting_parts","completed","delivered"]]],
    transaction:[["description","Descrição","text",true],["client_name","Cliente (se houver)","text",false],["kind","Tipo","select",true,["income","expense"]],["amount","Valor (R$)","number",true],["due_date","Vencimento","date",false],["status","Situação","select",true,["pending","paid"]]]
  };
  const labels={scheduled:"Agendado",confirmed:"Confirmado",completed:"Concluído",cancelled:"Cancelado",open:"Aberta",in_progress:"Em andamento",waiting_parts:"Aguardando peças",delivered:"Entregue",income:"Entrada",expense:"Despesa",pending:"Pendente",paid:"Pago"};
  function openModal(type){
    activeModal=type;editingId=null;$("#modalTitle").textContent=({client:"Novo cliente",appointment:"Novo agendamento",service:"Novo serviço ou produto",order:"Nova ordem de serviço",transaction:"Novo lançamento"})[type];
    $("#modalFields").innerHTML=fields[type].map(([name,label,input,required,options])=>{
      let control="";
      if(input==="textarea")control=`<textarea name="${name}" rows="3" ${required?"required":""}></textarea>`;
      else if(input==="select")control=`<select name="${name}" required>${options.map(o=>`<option value="${o}">${labels[o]||o}</option>`).join("")}</select>`;
      else control=`<input name="${name}" type="${input}" ${required?"required":""} ${input==="number"?'min="0" step="0.01"':""}>`;
      return `<label class="${input==="textarea"?"wide":""}">${label}${control}</label>`;
    }).join("");
    $("#itemDialog").showModal();
  }
  function closeModal(){if($("#itemDialog").open)$("#itemDialog").close();activeModal=null;}
  async function saveModal(e){
    e.preventDefault();const form=new FormData($("#itemForm"));const row={id:uid(),created_at:new Date().toISOString()};
    for(const [k,v] of form.entries())row[k]=v;
    if(row.amount!==undefined)row.amount=Number(row.amount);
    if(row.price!==undefined)row.price=Number(row.price);
    if(activeModal==="transaction"&&row.kind==="income"&&row.status==="paid")row.paid_at=new Date().toISOString();
    if(activeModal==="order")row.order_number=String(Date.now()).slice(-6);
    const table=({client:"clients",appointment:"appointments",service:"services",order:"orders",transaction:"transactions"})[activeModal];
    try{await insertRemote(table,row);await persist();closeModal();$("#itemForm").reset();toast("Cadastro salvo com sucesso.");}catch(err){toast("Erro ao salvar: "+err.message);}
  }

  if(supabase){
    supabase.auth.getSession().then(async({data})=>{if(data.session){currentUser=data.session.user;await loadRemote();showApp(currentUser);}});
    supabase.auth.onAuthStateChange(async(event,session)=>{if(event==="SIGNED_IN"&&session&&!currentUser){currentUser=session.user;await loadRemote();showApp(currentUser);}});
  }
  // Registro de service worker para instalação como aplicativo (PWA).
  if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("service-worker.js").catch(()=>{});
})();