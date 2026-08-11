import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, getDoc, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAO-XyaXaPA5KbQo_Pue48-FXYnOGDH99s",
  authDomain: "pwa-top-telecom.firebaseapp.com",
  projectId: "pwa-top-telecom",
  storageBucket: "pwa-top-telecom.firebasestorage.app",
  messagingSenderId: "268860893450",
  appId: "1:268860893450:web:c4875d8a97f446a62bb2f3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
setPersistence(auth, browserLocalPersistence);

const ADMINS = [
    "pwatoptelecom@gmail.com",
    "vinicius.rios@bctel.com.br",
    "antonio.queiros@bctel.com.br"
];

const PERFIS_CARDS = {
    'vendas': ['crm', 'mapa-nexus', 'top-nexus', 'chamados-abertura', 'book-b2b', 'book-b2c', 'book-avancado'],
    'ti': ['crm', 'mapa-nexus', 'top-nexus', 'chamados-abertura', 'chamados-acompanhamento', 'book-b2b', 'book-b2c', 'book-avancado'],
    'rh': ['crm', 'mapa-nexus', 'top-nexus', 'chamados-abertura', 'chamados-acompanhamento', 'book-b2b', 'book-b2c', 'book-avancado'],
    'gerencia': ['crm', 'mapa-nexus', 'top-nexus', 'chamados-abertura', 'chamados-acompanhamento', 'book-b2b', 'book-b2c', 'book-avancado']
};

let usuarioAtual = null;

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userGreeting = document.getElementById('user-greeting');

const tabMural = document.getElementById('tab-mural');
const tabMetas = document.getElementById('tab-metas');
const tabApps = document.getElementById('tab-apps');
const tabAgenda = document.getElementById('tab-agenda');
const tabEquipe = document.getElementById('tab-equipe');
const tabAdm = document.getElementById('tab-adm');

const muralContainer = document.getElementById('mural-container');
const metasContainer = document.getElementById('metas-container');
const appsContainer = document.getElementById('apps-container');
const agendaContainer = document.getElementById('agenda-container');
const equipeContainer = document.getElementById('equipe-container');
const admContainer = document.getElementById('adm-container');

// VISUALIZADOR INTERNO
const viewerContainer = document.getElementById('viewer-container');
const appViewer = document.getElementById('app-viewer');
const viewerTitle = document.getElementById('viewer-title');
const closeViewerBtn = document.getElementById('close-viewer-btn');
const tabsMenu = document.querySelector('.tabs-menu');

const avisoForm = document.getElementById('aviso-form');
const listaAvisos = document.getElementById('lista-avisos');
const btnSalvarMetas = document.getElementById('btn-salvar-metas');
const metaAdmForm = document.getElementById('meta-adm-form');
const listaEquipeMetas = document.getElementById('lista-equipe-metas');
const vipForm = document.getElementById('vip-form');

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function validarAcesso(user) {
    const email = user.email.toLowerCase();
    const dominiosAutorizados = ["@bctel.com.br", "@toptelecomsp1.com.br"];
    if (dominiosAutorizados.some(dominio => email.endsWith(dominio)) || ADMINS.includes(email)) return true;
    try {
        const vipSnap = await getDoc(doc(db, "convidados", email));
        return vipSnap.exists();
    } catch (e) { return false; }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (await validarAcesso(user)) { usuarioAtual = user; await exibirDashboard(); }
        else { alert("⛔ ACESSO NEGADO!"); signOut(auth); }
    } else {
        loginSection.classList.remove('hidden'); loginSection.classList.add('active');
        dashboardSection.classList.remove('active'); dashboardSection.classList.add('hidden');
    }
});

getRedirectResult(auth).then(async (result) => {
    if (result && result.user) {
        if (await validarAcesso(result.user)) { usuarioAtual = result.user; await exibirDashboard(); }
        else { alert("⛔ ACESSO NEGADO!"); signOut(auth); }
    }
}).catch(err => console.error(err));

async function exibirDashboard() {
    loginSection.classList.remove('active'); loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden'); dashboardSection.classList.add('active');
    userGreeting.innerText = `Olá, ${usuarioAtual.displayName}!`;

    const email = usuarioAtual.email.toLowerCase();
    const eAdminRoot = ADMINS.includes(email);

    let perfilUsuario = 'vendas';
    let cardsPermitidos = PERFIS_CARDS['vendas'];
    
    try {
        const userRef = doc(db, "usuarios", email);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            perfilUsuario = userSnap.data().perfil || 'vendas';
            cardsPermitidos = userSnap.data().cardsPermitidos || PERFIS_CARDS[perfilUsuario];
        } else {
            await setDoc(userRef, { nome: usuarioAtual.displayName, email: email, perfil: perfilUsuario, cardsPermitidos: cardsPermitidos, criadoEm: new Date() });
        }
        
        if (perfilUsuario === 'gerencia' || perfilUsuario === 'rh' || eAdminRoot) {
            tabEquipe.classList.remove('hidden'); tabAdm.classList.remove('hidden');
            carregarVisaoGeralMetas(); carregarListaUsuarios();
        } else if (perfilUsuario === 'ti') {
            tabAdm.classList.remove('hidden'); carregarListaUsuarios();
        }

        document.querySelectorAll('.glass-card[data-card-id]').forEach(card => {
            if (cardsPermitidos.includes(card.getAttribute('data-card-id'))) card.classList.remove('hidden');
            else card.classList.add('hidden');
        });

    } catch (e) { console.error(e); }

    carregarAvisos();
    carregarMetasUsuario();
    carregarAgendamentos();
}

loginBtn.addEventListener('click', () => {
    const txt = loginBtn.innerHTML; loginBtn.innerHTML = "Carregando...";
    if (isIOS) signInWithRedirect(auth, provider);
    else signInWithPopup(auth, provider).then(async (res) => {
        if (await validarAcesso(res.user)) { usuarioAtual = res.user; await exibirDashboard(); loginBtn.innerHTML = txt; }
        else { alert("⛔ ACESSO NEGADO!"); signOut(auth); loginBtn.innerHTML = txt; }
    }).catch(e => { loginBtn.innerHTML = txt; });
});
logoutBtn.addEventListener('click', () => signOut(auth).then(() => { usuarioAtual = null; }));

function ocultarVisualizador() {
    appViewer.src = "";
    viewerContainer.classList.add('hidden');
    tabsMenu.classList.remove('hidden');
}

// NAVEGAÇÃO
[tabMural, tabMetas, tabApps, tabAgenda, tabEquipe, tabAdm].forEach((btn, index) => {
    const containers = [muralContainer, metasContainer, appsContainer, agendaContainer, equipeContainer, admContainer];
    btn.addEventListener('click', () => {
        ocultarVisualizador(); // Fecha o sistema interno se tiver aberto
        [tabMural, tabMetas, tabApps, tabAgenda, tabEquipe, tabAdm].forEach(b => b.classList.remove('primary'));
        containers.forEach(c => c.classList.add('hidden'));
        btn.classList.add('primary'); containers[index].classList.remove('hidden');
    });
});

// ============================================
// LOGICA DO VISUALIZADOR INTERNO (iFRAME)
// ============================================
document.querySelectorAll('.btn-track').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Se o link não for do CRM, bloqueia o redirecionamento e abre internamente
        const targetUrl = btn.getAttribute('href');
        if(!targetUrl.includes('crm5.com.br')) {
            e.preventDefault();
            let finalUrl = targetUrl;
            
            // Força o Google Drive a exibir os Books no modo preview
            if (finalUrl.includes('drive.google.com')) {
                finalUrl = finalUrl.replace(/\/view.*/, '/preview');
            }
            
            const sysName = btn.getAttribute('data-name');
            viewerTitle.innerText = `Acessando: ${sysName}`;
            appViewer.src = finalUrl;
            
            // Esconde TUDO e mostra o Visualizador
            appsContainer.classList.add('hidden');
            tabsMenu.classList.add('hidden');
            viewerContainer.classList.remove('hidden');
        }
        registrarLog(`Acessou: ${btn.getAttribute('data-name')}`);
    });
});

closeViewerBtn.addEventListener('click', () => {
    ocultarVisualizador();
    appsContainer.classList.remove('hidden'); // Volta para a grade
});


// ============================================
// METAS E VISÃO DA EQUIPE
// ============================================
function atualizarBarraUI(nome, feito, meta) {
    const m = meta || 0; const f = feito || 0;
    const pct = m > 0 ? Math.min(Math.round((f / m) * 100), 100) : 0;
    document.getElementById(`lbl-${nome}`).innerText = `${f} / ${m} (${pct}%)`;
    document.getElementById(`bar-${nome}`).style.width = `${pct}%`;
}

function carregarMetasUsuario() {
    onSnapshot(doc(db, "metas", usuarioAtual.email.toLowerCase()), (docSnap) => {
        let d = { fibraFeito: 0, fibraMeta: 0, movelFeito: 0, movelMeta: 0, avancadoFeito: 0, avancadoMeta: 0, vvnFeito: 0, vvnMeta: 0 };
        if (docSnap.exists()) d = { ...d, ...docSnap.data() };
        atualizarBarraUI('fibra', d.fibraFeito, d.fibraMeta); atualizarBarraUI('movel', d.movelFeito, d.movelMeta);
        atualizarBarraUI('avancado', d.avancadoFeito, d.avancadoMeta); atualizarBarraUI('vvn', d.vvnFeito, d.vvnMeta);
        document.getElementById('f-fibra').value = d.fibraFeito || ''; document.getElementById('f-movel').value = d.movelFeito || '';
        document.getElementById('f-avancado').value = d.avancadoFeito || ''; document.getElementById('f-vvn').value = d.vvnFeito || '';
    });
}

btnSalvarMetas.addEventListener('click', async () => {
    btnSalvarMetas.innerHTML = "Salvando...";
    try {
        await setDoc(doc(db, "metas", usuarioAtual.email.toLowerCase()), {
            fibraFeito: Number(document.getElementById('f-fibra').value)||0, movelFeito: Number(document.getElementById('f-movel').value)||0,
            avancadoFeito: Number(document.getElementById('f-avancado').value)||0, vvnFeito: Number(document.getElementById('f-vvn').value)||0,
            nomeVendedor: usuarioAtual.displayName, ultimaAtualizacaoFeito: new Date()
        }, { merge: true });
        alert("Resultados salvos!");
    } catch (e) { alert("Erro."); }
    btnSalvarMetas.innerHTML = "Salvar Resultados";
});

metaAdmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailVendedor = document.getElementById('meta-email').value;
    if(!emailVendedor) return alert("Selecione um vendedor!");
    try {
        await setDoc(doc(db, "metas", emailVendedor), {
            fibraMeta: Number(document.getElementById('m-fibra').value)||0, movelMeta: Number(document.getElementById('m-movel').value)||0,
            avancadoMeta: Number(document.getElementById('m-avancado').value)||0, vvnMeta: Number(document.getElementById('m-vvn').value)||0,
            emailVendedor: emailVendedor, ultimaAtualizacaoMeta: new Date()
        }, { merge: true });
        alert(`Metas atualizadas!`); metaAdmForm.reset();
    } catch (e) {}
});

function carregarVisaoGeralMetas() {
    onSnapshot(collection(db, "metas"), (snapshot) => {
        listaEquipeMetas.innerHTML = snapshot.empty ? "<p style='color:#94a3b8; font-size:13px;'>Nenhuma meta cadastrada ainda.</p>" : "";
        snapshot.forEach((docSnap) => {
            const v = docSnap.data();
            const pFibra = v.fibraMeta > 0 ? Math.round(((v.fibraFeito||0)/(v.fibraMeta))*100) : 0;
            const pMovel = v.movelMeta > 0 ? Math.round(((v.movelFeito||0)/(v.movelMeta))*100) : 0;
            listaEquipeMetas.innerHTML += `
                <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px;">
                    <strong style="color: #00d2ff; display:block; margin-bottom:8px;">👤 ${v.nomeVendedor || docSnap.id}</strong>
                    <div style="font-size: 12px; color: #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <span>Fibra: ${v.fibraFeito||0}/${v.fibraMeta||0} (${pFibra}%)</span><span>Móvel: ${v.movelFeito||0}/${v.movelMeta||0} (${pMovel}%)</span>
                        <span>Avançado: ${v.avancadoFeito||0}/${v.avancadoMeta||0}</span><span>VVN: ${v.vvnFeito||0}/${v.vvnMeta||0}</span>
                    </div>
                </div>`;
        });
    });
}

// ============================================
// PAINEL ADM E VIP
// ============================================
function carregarListaUsuarios() {
    onSnapshot(collection(db, "usuarios"), (snapshot) => {
        let opt = '<option value="">Selecione o usuário...</option>';
        snapshot.forEach(docSnap => { opt += `<option value="${docSnap.id}">${docSnap.data().nome} (${docSnap.id})</option>`; });
        document.getElementById('meta-email').innerHTML = opt;
        document.getElementById('user-email-perm').innerHTML = opt;
    });
}

document.getElementById('user-perfil').addEventListener('change', (e) => {
    const cards = PERFIS_CARDS[e.target.value];
    document.querySelectorAll('.card-check').forEach(chk => { chk.checked = cards.includes(chk.value); });
});

document.getElementById('permissoes-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailT = document.getElementById('user-email-perm').value;
    if(!emailT) return alert("Selecione um usuário!");
    try {
        await setDoc(doc(db, "usuarios", emailT), { perfil: document.getElementById('user-perfil').value, cardsPermitidos: Array.from(document.querySelectorAll('.card-check:checked')).map(cb => cb.value) }, { merge: true });
        alert(`Acessos salvos!`); e.target.reset();
    } catch (err) {}
});

if(vipForm) vipForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailVip = document.getElementById('vip-email').value.trim().toLowerCase();
    try {
        await setDoc(doc(db, "convidados", emailVip), { email: emailVip, adicionadoPor: usuarioAtual.email, data: new Date() });
        alert(`✅ Acesso VIP liberado para: ${emailVip}`); vipForm.reset();
    } catch (e) {}
});

// ============================================
// AVISOS E MURAL (COM 24H E IMAGEM)
// ============================================
avisoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "avisos"), { 
            titulo: document.getElementById('aviso-titulo').value, 
            mensagem: document.getElementById('aviso-mensagem').value, 
            imagemUrl: document.getElementById('aviso-imagem').value.trim(),
            expira24h: document.getElementById('aviso-24h').checked,
            autor: usuarioAtual.displayName, 
            dataHora: new Date() 
        });
        avisoForm.reset(); alert("Comunicado publicado!"); trocarAba(tabMural, muralContainer); 
    } catch (err) {}
});

function carregarAvisos() {
    onSnapshot(query(collection(db, "avisos"), orderBy("dataHora", "desc"), limit(20)), (snapshot) => {
        listaAvisos.innerHTML = "";
        const agora = Date.now();
        let possuiAvisos = false;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Verifica se expirou (maior que 24 horas = 86400000 milissegundos)
            if (data.expira24h && data.dataHora) {
                const tempoPost = data.dataHora.toMillis();
                if ((agora - tempoPost) > 86400000) return; 
            }
            
            possuiAvisos = true;
            const dataStr = data.dataHora ? new Date(data.dataHora.toDate()).toLocaleString('pt-BR') : '';
            const imgHtml = data.imagemUrl ? `<img src="${data.imagemUrl}" style="width: 100%; border-radius: 8px; margin-top: 15px; max-height: 400px; object-fit: contain;">` : '';
            
            listaAvisos.innerHTML += `
                <div class="rh-card">
                    <h4>📢 ${data.titulo}</h4>
                    <p style="white-space: pre-wrap;">${data.mensagem}</p>
                    ${imgHtml}
                    <small>Por ${data.autor} em ${dataStr}</small>
                </div>
            `;
        });

        if(!possuiAvisos) listaAvisos.innerHTML = "<p style='color:#94a3b8; font-size:13px;'>Nenhum aviso no momento.</p>";
    });
}

// ============================================
// AGENDA E LOGS
// ============================================
async function registrarLog(acao) { if (usuarioAtual) addDoc(collection(db, "logs"), { email: usuarioAtual.email, nome: usuarioAtual.displayName, acao: acao, dataHora: new Date() }).catch(e => {}); }

document.getElementById('notify-btn').addEventListener('click', () => { if ("Notification" in window) Notification.requestPermission().then(p => { if (p === "granted") alert("Avisos ativos!"); }); });

document.getElementById('agenda-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "agendamentos"), { nome: document.getElementById('cliente-nome').value, fone: document.getElementById('cliente-fone').value, dataHora: document.getElementById('cliente-data').value, obs: document.getElementById('cliente-obs').value, notificado: false, criadoEm: new Date() });
        e.target.reset(); alert("Salvo!");
    } catch (err) {}
});

function carregarAgendamentos() {
    onSnapshot(query(collection(db, "agendamentos"), orderBy("dataHora", "asc")), (snapshot) => {
        const lista = document.getElementById('lista-agendamentos'); lista.innerHTML = ""; const agora = new Date().toISOString();
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.dataHora <= agora && !data.notificado && Notification.permission === "granted") new Notification("🚨 Retorno!", { body: `Ligar para: ${data.nome}` });
            lista.innerHTML += `<div class="glass-card" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; gap: 10px;"><div><h4 style="font-size: 18px; color: #00d2ff;">${data.nome}</h4><p style="font-size: 14px; color: #cbd5e1;">📞 ${data.fone} | 📅 ${new Date(data.dataHora).toLocaleString('pt-BR')}</p></div><button class="glass-button small btn-excluir" data-id="${docSnap.id}" style="background: rgba(239,68,68,0.2);">OK</button></div>`;
        });
        document.querySelectorAll('.btn-excluir').forEach(btn => btn.addEventListener('click', async (e) => await deleteDoc(doc(db, "agendamentos", e.target.getAttribute('data-id')))));
    });
}
