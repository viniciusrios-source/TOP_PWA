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

// COLOQUE SEU E-MAIL AQUI PARA SER O GESTOR
const ADMINS = [
    "pwatoptelecom@gmail.com",
    "vinicius.rios@bctel.com.br",
    "antonio.queiros@bctel.com.br"
];

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
const tabAdm = document.getElementById('tab-adm');

const muralContainer = document.getElementById('mural-container');
const metasContainer = document.getElementById('metas-container');
const appsContainer = document.getElementById('apps-container');
const agendaContainer = document.getElementById('agenda-container');
const admContainer = document.getElementById('adm-container');

const avisoForm = document.getElementById('aviso-form');
const listaAvisos = document.getElementById('lista-avisos');
const btnSalvarMetas = document.getElementById('btn-salvar-metas');
const metaAdmForm = document.getElementById('meta-adm-form');
const listaEquipeMetas = document.getElementById('lista-equipe-metas');

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// MONITOR DE SESSÃO
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        await exibirDashboard();
    } else {
        loginSection.classList.remove('hidden');
        loginSection.classList.add('active');
        dashboardSection.classList.remove('active');
        dashboardSection.classList.add('hidden');
    }
});

getRedirectResult(auth).then(async (result) => {
    if (result && result.user) {
        usuarioAtual = result.user;
        await exibirDashboard();
    }
}).catch(err => console.error(err));

async function exibirDashboard() {
    loginSection.classList.remove('active');
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    dashboardSection.classList.add('active');
    
    userGreeting.innerText = `Olá, ${usuarioAtual.displayName}!`;
  
  // SALVA/ATUALIZA O USUÁRIO NO BANCO DE DADOS
    try {
        await setDoc(doc(db, "usuarios", usuarioAtual.email.toLowerCase()), {
            nome: usuarioAtual.displayName,
            email: usuarioAtual.email.toLowerCase(),
            ultimoAcesso: new Date()
        }, { merge: true });
    } catch (e) { console.error("Erro ao salvar user", e); }

    const eAdmin = ADMINS.includes(usuarioAtual.email.toLowerCase());
    if (eAdmin) {
        tabAdm.classList.remove('hidden');
        carregarVisaoGeralMetas(); // Carrega overview para o Gestor
        carregarListaUsuarios();
    }

    await aplicarPermissoes(usuarioAtual.email.toLowerCase(), eAdmin);
    carregarAvisos();
    carregarMetasUsuario(); // Carrega metas do vendedor logado
    carregarAgendamentos();
}

// LOGIN / LOGOUT
loginBtn.addEventListener('click', () => {
    const textoOriginal = loginBtn.innerHTML;
    loginBtn.innerHTML = "Carregando...";
    if (isIOS) {
        signInWithRedirect(auth, provider);
    } else {
        signInWithPopup(auth, provider).then(async (result) => {
            usuarioAtual = result.user;
            await exibirDashboard();
            loginBtn.innerHTML = textoOriginal;
        }).catch((error) => {
            loginBtn.innerHTML = textoOriginal;
            if (error.code !== 'auth/popup-closed-by-user') alert("Erro no login.");
        });
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => { usuarioAtual = null; });
});

// NAVEGAÇÃO DE ABAS
tabMural.addEventListener('click', () => trocarAba(tabMural, muralContainer));
tabMetas.addEventListener('click', () => trocarAba(tabMetas, metasContainer));
tabApps.addEventListener('click', () => trocarAba(tabApps, appsContainer));
tabAgenda.addEventListener('click', () => trocarAba(tabAgenda, agendaContainer));
tabAdm.addEventListener('click', () => trocarAba(tabAdm, admContainer));

function trocarAba(abaAtiva, containerAtivo) {
    [tabMural, tabMetas, tabApps, tabAgenda, tabAdm].forEach(b => b.classList.remove('primary'));
    [muralContainer, metasContainer, appsContainer, agendaContainer, admContainer].forEach(c => c.classList.add('hidden'));
    abaAtiva.classList.add('primary');
    containerAtivo.classList.remove('hidden');
}

// ============================================
// MÓDULO DE METAS (VENDEDOR E GESTOR)
// ============================================

function atualizarBarraUI(nome, feito, meta) {
    const m = meta || 0; const f = feito || 0;
    const pct = m > 0 ? Math.min(Math.round((f / m) * 100), 100) : 0;
    document.getElementById(`lbl-${nome}`).innerText = `${f} / ${m} (${pct}%)`;
    document.getElementById(`bar-${nome}`).style.width = `${pct}%`;
}

// 1. O VENDEDOR LÊ E ATUALIZA SEUS NÚMEROS
function carregarMetasUsuario() {
    onSnapshot(doc(db, "metas", usuarioAtual.email.toLowerCase()), (docSnap) => {
        let d = {
            fibraFeito: 0, fibraMeta: 0,
            movelFeito: 0, movelMeta: 0,
            avancadoFeito: 0, avancadoMeta: 0,
            vvnFeito: 0, vvnMeta: 0
        };
        if (docSnap.exists()) d = { ...d, ...docSnap.data() };
        
        atualizarBarraUI('fibra', d.fibraFeito, d.fibraMeta);
        atualizarBarraUI('movel', d.movelFeito, d.movelMeta);
        atualizarBarraUI('avancado', d.avancadoFeito, d.avancadoMeta);
        atualizarBarraUI('vvn', d.vvnFeito, d.vvnMeta);

        document.getElementById('f-fibra').value = d.fibraFeito || '';
        document.getElementById('f-movel').value = d.movelFeito || '';
        document.getElementById('f-avancado').value = d.avancadoFeito || '';
        document.getElementById('f-vvn').value = d.vvnFeito || '';
    });
}

btnSalvarMetas.addEventListener('click', async () => {
    btnSalvarMetas.innerHTML = "Salvando...";
    try {
        await setDoc(doc(db, "metas", usuarioAtual.email.toLowerCase()), {
            fibraFeito: Number(document.getElementById('f-fibra').value) || 0,
            movelFeito: Number(document.getElementById('f-movel').value) || 0,
            avancadoFeito: Number(document.getElementById('f-avancado').value) || 0,
            vvnFeito: Number(document.getElementById('f-vvn').value) || 0,
            nomeVendedor: usuarioAtual.displayName, // Para o ADM saber de quem é
            ultimaAtualizacaoFeito: new Date()
        }, { merge: true }); // Merge garante que NÃO apaga a Meta do Gestor
        alert("Resultados atualizados com sucesso!");
    } catch (error) { alert("Erro ao salvar resultados."); }
    btnSalvarMetas.innerHTML = "Salvar Resultados";
});

// 2. O GESTOR DEFINE AS METAS DO VENDEDOR
metaAdmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailVendedor = document.getElementById('meta-email').value.trim().toLowerCase();
    try {
        await setDoc(doc(db, "metas", emailVendedor), {
            fibraMeta: Number(document.getElementById('m-fibra').value) || 0,
            movelMeta: Number(document.getElementById('m-movel').value) || 0,
            avancadoMeta: Number(document.getElementById('m-avancado').value) || 0,
            vvnMeta: Number(document.getElementById('m-vvn').value) || 0,
            emailVendedor: emailVendedor,
            ultimaAtualizacaoMeta: new Date()
        }, { merge: true }); // Merge garante que não apaga o "Feito" pelo vendedor
        alert(`Metas atualizadas para ${emailVendedor}!`);
        metaAdmForm.reset();
    } catch (error) { alert("Erro ao salvar metas do vendedor."); }
});

// 3. O GESTOR VÊ O PROGRESSO DE TODOS
function carregarVisaoGeralMetas() {
    onSnapshot(collection(db, "metas"), (snapshot) => {
        listaEquipeMetas.innerHTML = "";
        if (snapshot.empty) {
            listaEquipeMetas.innerHTML = "<p style='color:#94a3b8; font-size:13px;'>Nenhuma meta cadastrada ainda.</p>";
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const v = docSnap.data();
            const email = docSnap.id;
            const nome = v.nomeVendedor || email;
            
            const pFibra = v.fibraMeta > 0 ? Math.round(((v.fibraFeito||0) / v.fibraMeta) * 100) : 0;
            const pMovel = v.movelMeta > 0 ? Math.round(((v.movelFeito||0) / v.movelMeta) * 100) : 0;

            listaEquipeMetas.innerHTML += `
                <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <strong style="color: #00d2ff;">👤 ${nome}</strong>
                    </div>
                    <div style="font-size: 12px; color: #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <span>Fibra: ${v.fibraFeito||0}/${v.fibraMeta||0} (${pFibra}%)</span>
                        <span>Móvel: ${v.movelFeito||0}/${v.movelMeta||0} (${pMovel}%)</span>
                        <span>Avançado: ${v.avancadoFeito||0}/${v.avancadoMeta||0}</span>
                        <span>VVN: ${v.vvnFeito||0}/${v.vvnMeta||0}</span>
                    </div>
                </div>
            `;
        });
    });
}

// ============================================
// OUTROS MÓDULOS (AVISOS, AGENDA E PERMISSÕES)
// ============================================

avisoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "avisos"), {
            titulo: document.getElementById('aviso-titulo').value, 
            mensagem: document.getElementById('aviso-mensagem').value,
            autor: usuarioAtual.displayName, dataHora: new Date()
        });
        avisoForm.reset(); alert("Comunicado publicado!"); trocarAba(tabMural, muralContainer); 
    } catch (err) {}
});

function carregarAvisos() {
    onSnapshot(query(collection(db, "avisos"), orderBy("dataHora", "desc"), limit(10)), (snapshot) => {
        listaAvisos.innerHTML = snapshot.empty ? "<p style='color:#94a3b8; font-size:13px;'>Nenhum aviso no momento.</p>" : "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dataStr = data.dataHora ? new Date(data.dataHora.toDate()).toLocaleString('pt-BR') : '';
            listaAvisos.innerHTML += `<div class="rh-card"><h4>📢 ${data.titulo}</h4><p>${data.mensagem}</p><small>Publicado por ${data.autor} em ${dataStr}</small></div>`;
        });
    });
}

async function aplicarPermissoes(email, eAdmin) {
    const allCards = document.querySelectorAll('.glass-card[data-card-id]');
    if (eAdmin) { allCards.forEach(c => c.classList.remove('hidden')); return; }
    try {
        const docSnap = await getDoc(doc(db, "permissoes", email));
        if (docSnap.exists()) {
            const permitidos = docSnap.data().cardsPermitidos || [];
            allCards.forEach(card => permitidos.includes(card.getAttribute('data-card-id')) ? card.classList.remove('hidden') : card.classList.add('hidden'));
        }
    } catch (e) {}
}

document.getElementById('permissoes-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, "permissoes", document.getElementById('user-email-perm').value.trim().toLowerCase()), {
            cardsPermitidos: Array.from(document.querySelectorAll('.card-check:checked')).map(cb => cb.value), atualizadoEm: new Date()
        });
        alert(`Permissões salvas!`); e.target.reset();
    } catch (err) {}
});

document.getElementById('notify-btn').addEventListener('click', () => { if ("Notification" in window) Notification.requestPermission().then(p => { if (p === "granted") alert("Avisos ativos!"); }); });

document.getElementById('agenda-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "agendamentos"), {
            nome: document.getElementById('cliente-nome').value, fone: document.getElementById('cliente-fone').value,
            dataHora: document.getElementById('cliente-data').value, obs: document.getElementById('cliente-obs').value,
            notificado: false, criadoEm: new Date()
        });
        e.target.reset(); alert("Salvo!");
    } catch (err) {}
});

function carregarAgendamentos() {
    onSnapshot(query(collection(db, "agendamentos"), orderBy("dataHora", "asc")), (snapshot) => {
        const lista = document.getElementById('lista-agendamentos');
        lista.innerHTML = "";
        const agora = new Date().toISOString();
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.dataHora <= agora && !data.notificado && Notification.permission === "granted") new Notification("🚨 Retorno!", { body: `Ligar para: ${data.nome}` });
            lista.innerHTML += `<div class="glass-card" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; gap: 10px;"><div><h4 style="font-size: 18px; color: #00d2ff;">${data.nome}</h4><p style="font-size: 14px; color: #cbd5e1;">📞 ${data.fone} | 📅 ${new Date(data.dataHora).toLocaleString('pt-BR')}</p></div><button class="glass-button small btn-excluir" data-id="${docSnap.id}" style="background: rgba(239,68,68,0.2);">OK</button></div>`;
        });
        document.querySelectorAll('.btn-excluir').forEach(btn => btn.addEventListener('click', async (e) => await deleteDoc(doc(db, "agendamentos", e.target.getAttribute('data-id')))));
    });
}
// ============================================
// LISTA AUTOMÁTICA DE USUÁRIOS NO PAINEL ADM
// ============================================
function carregarListaUsuarios() {
    onSnapshot(collection(db, "usuarios"), (snapshot) => {
        const selectMeta = document.getElementById('meta-email');
        const selectPerm = document.getElementById('user-email-perm');
        
        let options = '<option value="">Selecione o funcionário...</option>';
        
        snapshot.forEach(docSnap => {
            const u = docSnap.data();
            options += `<option value="${u.email}">${u.nome} (${u.email})</option>`;
        });
        
        if(selectMeta) selectMeta.innerHTML = options;
        if(selectPerm) selectPerm.innerHTML = options;
    });
}
