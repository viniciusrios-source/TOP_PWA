import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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

// LISTA DE ADMINISTRADORES (Insira seu e-mail do Google aqui)
const ADMINS = [
    "pwatoptelecom@gmail.com", 
    "seu-email-aqui@gmail.com" 
];

let usuarioAtual = null;

// Elementos de UI
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userGreeting = document.getElementById('user-greeting');

const tabApps = document.getElementById('tab-apps');
const tabAgenda = document.getElementById('tab-agenda');
const tabAdm = document.getElementById('tab-adm');

const appsContainer = document.getElementById('apps-container');
const agendaContainer = document.getElementById('agenda-container');
const admContainer = document.getElementById('adm-container');

const notifyBtn = document.getElementById('notify-btn');
const agendaForm = document.getElementById('agenda-form');
const listaAgendamentos = document.getElementById('lista-agendamentos');

const permissoesForm = document.getElementById('permissoes-form');
const listaLogs = document.getElementById('lista-logs');

// NAVEGAÇÃO ENTRE ABAS
tabApps.addEventListener('click', () => {
    trocarAba(tabApps, appsContainer);
});

tabAgenda.addEventListener('click', () => {
    trocarAba(tabAgenda, agendaContainer);
});

tabAdm.addEventListener('click', () => {
    trocarAba(tabAdm, admContainer);
    carregarLogs();
});

function trocarAba(abaAtiva, containerAtivo) {
    [tabApps, tabAgenda, tabAdm].forEach(b => b.classList.remove('primary'));
    [appsContainer, agendaContainer, admContainer].forEach(c => c.classList.add('hidden'));
    
    abaAtiva.classList.add('primary');
    containerAtivo.classList.remove('hidden');
}

// LOGIN
loginBtn.addEventListener('click', () => {
    const textoOriginal = loginBtn.innerHTML;
    loginBtn.innerHTML = "Carregando...";

    signInWithPopup(auth, provider).then(async (result) => {
        usuarioAtual = result.user;
        
        loginSection.classList.remove('active');
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        dashboardSection.classList.add('active');
        
        userGreeting.innerText = `Olá, ${usuarioAtual.displayName}!`;
        loginBtn.innerHTML = textoOriginal;

        // REGISTRAR LOG DE ACESSO
        registrarLog("Fez Login no Hub");

        // VERIFICAR SE É ADM
        const eAdmin = ADMINS.includes(usuarioAtual.email.toLowerCase());
        if (eAdmin) {
            tabAdm.classList.remove('hidden');
        }

        // APLICAR PERMISSÕES DE CARDS
        await aplicarPermissoes(usuarioAtual.email.toLowerCase(), eAdmin);
        carregarAgendamentos();

    }).catch(err => {
        console.error(err);
        alert("Erro no login.");
        loginBtn.innerHTML = textoOriginal;
    });
});

// LOGOUT
logoutBtn.addEventListener('click', () => {
    if (usuarioAtual) registrarLog("Fez Logout");
    signOut(auth).then(() => {
        dashboardSection.classList.remove('active');
        dashboardSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        loginSection.classList.add('active');
    });
});

// APLICAR PERMISSÕES NOS CARDS
async function aplicarPermissoes(email, eAdmin) {
    const allCards = document.querySelectorAll('.glass-card[data-card-id]');
    
    if (eAdmin) {
        allCards.forEach(c => c.classList.remove('hidden'));
        return;
    }

    try {
        const docRef = doc(db, "permissoes", email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const permitidos = docSnap.data().cardsPermitidos || [];
            allCards.forEach(card => {
                const cardId = card.getAttribute('data-card-id');
                if (permitidos.includes(cardId)) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        } else {
            // Se o usuário não tem regra cadastrada, mostra todos por padrão
            allCards.forEach(c => c.classList.remove('hidden'));
        }
    } catch (e) {
        console.error("Erro ao carregar permissões:", e);
    }
}

// RASTREAR CLIQUES NOS CARDS
document.querySelectorAll('.btn-track').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const cardName = e.target.getAttribute('data-name');
        registrarLog(`Acessou o App: ${cardName}`);
    });
});

// REGISTRAR LOG DE AUDITORIA NO FIRESTORE
async function registrarLog(acao) {
    if (!usuarioAtual) return;
    try {
        await addDoc(collection(db, "logs"), {
            email: usuarioAtual.email,
            nome: usuarioAtual.displayName,
            acao: acao,
            dataHora: new Date()
        });
    } catch (e) {
        console.error("Erro ao salvar log:", e);
    }
}

// CARREGAR LOGS NO PAINEL ADM
function carregarLogs() {
    const q = query(collection(db, "logs"), orderBy("dataHora", "desc"), limit(30));
    onSnapshot(q, (snapshot) => {
        listaLogs.innerHTML = "";
        snapshot.forEach(docSnap => {
            const log = docSnap.data();
            const dataFmt = log.dataHora ? new Date(log.dataHora.toDate()).toLocaleString('pt-BR') : '';
            listaLogs.innerHTML += `
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border-left: 3px solid #3b82f6; font-size: 13px;">
                    <strong>${log.nome || log.email}</strong> - <span style="color: #38bdf8;">${log.acao}</span>
                    <br><small style="color: #94a3b8;">${dataFmt}</small>
                </div>
            `;
        });
    });
}

// SALVAR PERMISSÕES DE UM USUÁRIO (ADM)
permissoesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailTarget = document.getElementById('user-email-perm').value.trim().toLowerCase();
    
    const checkboxes = document.querySelectorAll('.card-check:checked');
    const cardsPermitidos = Array.from(checkboxes).map(cb => cb.value);

    try {
        await setDoc(doc(db, "permissoes", emailTarget), {
            cardsPermitidos: cardsPermitidos,
            atualizadoEm: new Date()
        });
        alert(`Permissões salvas para ${emailTarget}!`);
        permissoesForm.reset();
    } catch (err) {
        console.error("Erro ao salvar permissões:", err);
        alert("Erro ao salvar permissões.");
    }
});

// NOTIFICAÇÕES
notifyBtn.addEventListener('click', () => {
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alert("Notificações ativadas!");
                new Notification("Hub de Apps", { body: "Avisos ativos!" });
            }
        });
    }
});

// AGENDA
agendaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('cliente-nome').value;
    const fone = document.getElementById('cliente-fone').value;
    const dataHora = document.getElementById('cliente-data').value;
    const obs = document.getElementById('cliente-obs').value;

    try {
        await addDoc(collection(db, "agendamentos"), {
            nome, fone, dataHora, obs,
            notificado: false, criadoEm: new Date()
        });
        agendaForm.reset();
        alert("Agendamento salvo!");
    } catch (err) { console.error(err); }
});

function carregarAgendamentos() {
    const q = query(collection(db, "agendamentos"), orderBy("dataHora", "asc"));
    onSnapshot(q, (snapshot) => {
        listaAgendamentos.innerHTML = "";
        const agora = new Date().toISOString();

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            if (data.dataHora <= agora && !data.notificado) {
                if (Notification.permission === "granted") {
                    new Notification("🚨 Retorno!", { body: `Ligar para: ${data.nome}` });
                }
            }

            listaAgendamentos.innerHTML += `
                <div class="glass-card" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                    <div>
                        <h4 style="font-size: 18px; color: #3b82f6;">${data.nome}</h4>
                        <p style="font-size: 14px; color: #cbd5e1;">📞 ${data.fone} | 📅 ${new Date(data.dataHora).toLocaleString('pt-BR')}</p>
                        <p style="font-size: 13px; color: #94a3b8;">${data.obs || ''}</p>
                    </div>
                    <button class="glass-button small btn-excluir" data-id="${id}" style="background: rgba(239, 68, 68, 0.2);">Concluir</button>
                </div>
            `;
        });

        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await deleteDoc(doc(db, "agendamentos", e.target.getAttribute('data-id')));
            });
        });
    });
}
