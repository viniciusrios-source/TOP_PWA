// Importações das ferramentas do Firebase direto da Nuvem
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração oficial do seu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAO-XyaXaPA5KbQo_Pue48-FXYnOGDH99s",
  authDomain: "pwa-top-telecom.firebaseapp.com",
  projectId: "pwa-top-telecom",
  storageBucket: "pwa-top-telecom.firebasestorage.app",
  messagingSenderId: "268860893450",
  appId: "1:268860893450:web:c4875d8a97f446a62bb2f3"
};

// Inicializações
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Elementos da Interface
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');

const tabApps = document.getElementById('tab-apps');
const tabAgenda = document.getElementById('tab-agenda');
const appsContainer = document.getElementById('apps-container');
const agendaContainer = document.getElementById('agenda-container');

const notifyBtn = document.getElementById('notify-btn');
const agendaForm = document.getElementById('agenda-form');
const listaAgendamentos = document.getElementById('lista-agendamentos');

// NAVEGAÇÃO ENTRE ABAS
tabApps.addEventListener('click', () => {
    tabApps.classList.add('primary');
    tabAgenda.classList.remove('primary');
    appsContainer.classList.remove('hidden');
    agendaContainer.classList.add('hidden');
});

tabAgenda.addEventListener('click', () => {
    tabAgenda.classList.add('primary');
    tabApps.classList.remove('primary');
    agendaContainer.classList.remove('hidden');
    appsContainer.classList.add('hidden');
});

// LOGIN COM GOOGLE
loginBtn.addEventListener('click', () => {
    const textoOriginal = loginBtn.innerHTML;
    loginBtn.innerHTML = "Carregando...";

    signInWithPopup(auth, provider)
        .then((result) => {
            loginSection.classList.remove('active');
            loginSection.classList.add('hidden');
            
            dashboardSection.classList.remove('hidden');
            dashboardSection.classList.add('active');
            
            loginBtn.innerHTML = textoOriginal;
            carregarAgendamentos(); // Carrega os agendamentos salvos
        }).catch((error) => {
            console.error("Erro no login:", error);
            alert("O login foi cancelado ou ocorreu um erro.");
            loginBtn.innerHTML = textoOriginal;
        });
});

// LOGOUT
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        dashboardSection.classList.remove('active');
        dashboardSection.classList.add('hidden');
        
        loginSection.classList.remove('hidden');
        loginSection.classList.add('active');
    });
});

// ATIVAR NOTIFICAÇÕES DO CELULAR
notifyBtn.addEventListener('click', () => {
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alert("Notificações ativadas com sucesso!");
                new Notification("Hub de Apps", { body: "Notificações de retornos ativas!" });
            } else {
                alert("A permissão para notificações foi negada.");
            }
        });
    } else {
        alert("Seu navegador não suporta notificações.");
    }
});

// ADICIONAR CLIENTE NA AGENDA (FIRESTORE)
agendaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('cliente-nome').value;
    const fone = document.getElementById('cliente-fone').value;
    const dataHora = document.getElementById('cliente-data').value;
    const obs = document.getElementById('cliente-obs').value;

    try {
        await addDoc(collection(db, "agendamentos"), {
            nome,
            fone,
            dataHora,
            obs,
            notificado: false,
            criadoEm: new Date()
        });
        agendaForm.reset();
        alert("Agendamento salvo com sucesso!");
    } catch (err) {
        console.error("Erro ao salvar:", err);
    }
});

// MONITORAR AGENDAMENTOS EM TEMPO REAL
function carregarAgendamentos() {
    const q = query(collection(db, "agendamentos"), orderBy("dataHora", "asc"));
    
    onSnapshot(q, (snapshot) => {
        listaAgendamentos.innerHTML = "";
        const agora = new Date().toISOString();

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            // Disparar notificação se chegou o momento do retorno
            if (data.dataHora <= agora && !data.notificado) {
                dispararNotificacao(data.nome, data.obs);
            }

            const cardHtml = `
                <div class="glass-card" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h4 style="font-size: 18px; color: #3b82f6;">${data.nome}</h4>
                        <p style="font-size: 14px; color: #cbd5e1;">📞 ${data.fone} | 📅 ${new Date(data.dataHora).toLocaleString('pt-BR')}</p>
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 5px;">${data.obs || 'Sem observações'}</p>
                    </div>
                    <button class="glass-button small btn-excluir" data-id="${id}" style="background: rgba(239, 68, 68, 0.2);">Concluir</button>
                </div>
            `;
            listaAgendamentos.innerHTML += cardHtml;
        });

        // Evento do botão Concluir/Excluir
        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.getAttribute('data-id');
                await deleteDoc(doc(db, "agendamentos", docId));
            });
        });
    });
}

function dispararNotificacao(cliente, obs) {
    if (Notification.permission === "granted") {
        new Notification("🚨 Lembrete de Retorno!", {
            body: `Está na hora de retornar para: ${cliente}. (${obs})`,
            icon: "https://cdn-icons-png.flaticon.com/512/2950/2950664.png"
        });
    }
}
