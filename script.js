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
// FORÇA O GOOGLE A SEMPRE MOSTRAR A TELA DE ESCOLHER CONTA
provider.setCustomParameters({
  prompt: 'select_account'
});

setPersistence(auth, browserLocalPersistence);

// COLOQUE SEU E-MAIL AQUI PARA SER O GESTOR
const ADMINS = [
    "pwatoptelecom@gmail.com"
];

let usuarioAtual = null;

// ELEMENTOS DE UI
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userGreeting = document.getElementById('user-greeting');

// ABAS (Botões e Containers)
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

// AVISOS, AGENDA E LOGS
const notifyBtn = document.getElementById('notify-btn');
const avisoForm = document.getElementById('aviso-form');
const listaAvisos = document.getElementById('lista-avisos');
const agendaForm = document.getElementById('agenda-form');
const listaAgendamentos = document.getElementById('lista-agendamentos');
const permissoesForm = document.getElementById('permissoes-form');
const listaLogs = document.getElementById('lista-logs');

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
}).catch(err => console.error("Erro Redirect:", err));

async function exibirDashboard() {
    loginSection.classList.remove('active');
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    dashboardSection.classList.add('active');
    
    userGreeting.innerText = `Olá, ${usuarioAtual.displayName}!`;
    registrarLog("Acessou a Intranet");

    const eAdmin = ADMINS.includes(usuarioAtual.email.toLowerCase());
    if (eAdmin) {
        tabAdm.classList.remove('hidden');
    }

    await aplicarPermissoes(usuarioAtual.email.toLowerCase(), eAdmin);
    carregarAvisos();
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
            console.error(error);
            loginBtn.innerHTML = textoOriginal;
            if (error.code !== 'auth/popup-closed-by-user') alert("Erro no login.");
        });
    }
});

logoutBtn.addEventListener('click', () => {
    if (usuarioAtual) registrarLog("Fez Logout");
    signOut(auth).then(() => { usuarioAtual = null; });
});

// NAVEGAÇÃO DE ABAS
tabMural.addEventListener('click', () => trocarAba(tabMural, muralContainer));
tabMetas.addEventListener('click', () => trocarAba(tabMetas, metasContainer));
tabApps.addEventListener('click', () => trocarAba(tabApps, appsContainer));
tabAgenda.addEventListener('click', () => trocarAba(tabAgenda, agendaContainer));
tabAdm.addEventListener('click', () => {
    trocarAba(tabAdm, admContainer);
    carregarLogs();
});

function trocarAba(abaAtiva, containerAtivo) {
    [tabMural, tabMetas, tabApps, tabAgenda, tabAdm].forEach(b => b.classList.remove('primary'));
    [muralContainer, metasContainer, appsContainer, agendaContainer, admContainer].forEach(c => c.classList.add('hidden'));
    abaAtiva.classList.add('primary');
    containerAtivo.classList.remove('hidden');
}

// --- MURAL DE AVISOS ---
avisoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('aviso-titulo').value;
    const mensagem = document.getElementById('aviso-mensagem').value;
    
    try {
        await addDoc(collection(db, "avisos"), {
            titulo, mensagem,
            autor: usuarioAtual.displayName,
            dataHora: new Date()
        });
        avisoForm.reset();
        alert("Comunicado publicado para toda a empresa!");
        trocarAba(tabMural, muralContainer); 
    } catch (err) { alert("Erro ao postar aviso."); }
});

function carregarAvisos() {
    const q = query(collection(db, "avisos"), orderBy("dataHora", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        listaAvisos.innerHTML = "";
        if (snapshot.empty) {
            listaAvisos.innerHTML = "<p style='color:#94a3b8; font-size:13px;'>Nenhum aviso no momento.</p>";
            return;
        }
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dataStr = data.dataHora ? new Date(data.dataHora.toDate()).toLocaleString('pt-BR') : '';
            listaAvisos.innerHTML += `
                <div class="rh-card">
                    <h4>📢 ${data.titulo}</h4>
                    <p>${data.mensagem}</p>
                    <small>Publicado por ${data.autor} em ${dataStr}</small>
                </div>
            `;
        });
    });
}

// PERMISSÕES
async function aplicarPermissoes(email, eAdmin) {
    const allCards = document.querySelectorAll('.glass-card[data-card-id]');
    if (eAdmin) {
        allCards.forEach(c => c.classList.remove('hidden'));
        return;
    }
    try {
        const docSnap = await getDoc(doc(db, "permissoes", email));
        if (docSnap.exists()) {
            const permitidos = docSnap.data().cardsPermitidos || [];
            allCards.forEach(card => {
                if (permitidos.includes(card.getAttribute('data-card-id'))) card.classList.remove('hidden');
                else card.classList.add('hidden');
            });
        }
    } catch (e) { console.error(e); }
}

permissoesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailTarget = document.getElementById('user-email-perm').value.trim().toLowerCase();
    const permitidos = Array.from(document.querySelectorAll('.card-check:checked')).map(cb => cb.value);
    try {
        await setDoc(doc(db, "permissoes", emailTarget), { cardsPermitidos: permitidos, atualizadoEm: new Date() });
        alert(`Permissões salvas!`);
        permissoesForm.reset();
    } catch (err) { alert("Erro ao salvar permissões."); }
});

// LOGS
document.querySelectorAll('.btn-track').forEach(btn => {
    btn.addEventListener('click', (e) => registrarLog(`Clicou: ${e.target.getAttribute('data-name')}`));
});

async function registrarLog(acao) {
    if (!usuarioAtual) return;
    addDoc(collection(db, "logs"), { email: usuarioAtual.email, nome: usuarioAtual.displayName, acao: acao, dataHora: new Date() }).catch(e => {});
}

function carregarLogs() {
    onSnapshot(query(collection(db, "logs"), orderBy("dataHora", "desc"), limit(30)), (snapshot) => {
        listaLogs.innerHTML = "";
        snapshot.forEach(docSnap => {
            const log = docSnap.data();
            const d = log.dataHora ? new Date(log.dataHora.toDate()).toLocaleString('pt-BR') : '';
            listaLogs.innerHTML += `
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border-left: 3px solid #00d2ff; font-size: 13px;">
                    <strong>${log.nome || log.email}</strong> - <span style="color: #e100ff;">${log.acao}</span><br><small style="color: #94a3b8;">${d}</small>
                </div>
            `;
        });
    });
}

// AGENDA NOTIFICAÇÕES
notifyBtn.addEventListener('click', () => {
    if ("Notification" in window) Notification.requestPermission().then(p => { if (p === "granted") alert("Avisos ativos!"); });
});

agendaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "agendamentos"), {
            nome: document.getElementById('cliente-nome').value, fone: document.getElementById('cliente-fone').value,
            dataHora: document.getElementById('cliente-data').value, obs: document.getElementById('cliente-obs').value,
            notificado: false, criadoEm: new Date()
        });
        agendaForm.reset(); alert("Salvo!");
    } catch (err) {}
});

function carregarAgendamentos() {
    onSnapshot(query(collection(db, "agendamentos"), orderBy("dataHora", "asc")), (snapshot) => {
        listaAgendamentos.innerHTML = "";
        const agora = new Date().toISOString();
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.dataHora <= agora && !data.notificado && Notification.permission === "granted") new Notification("🚨 Retorno!", { body: `Ligar para: ${data.nome}` });
            listaAgendamentos.innerHTML += `
                <div class="glass-card" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                    <div><h4 style="font-size: 18px; color: #00d2ff;">${data.nome}</h4><p style="font-size: 14px; color: #cbd5e1;">📞 ${data.fone} | 📅 ${new Date(data.dataHora).toLocaleString('pt-BR')}</p></div>
                    <button class="glass-button small btn-excluir" data-id="${docSnap.id}" style="background: rgba(239,68,68,0.2);">OK</button>
                </div>
            `;
        });
        document.querySelectorAll('.btn-excluir').forEach(btn => btn.addEventListener('click', async (e) => await deleteDoc(doc(db, "agendamentos", e.target.getAttribute('data-id')))));
    });
}
