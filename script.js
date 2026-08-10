// Importações do Firebase direto da nuvem (Links da Web)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// A sua configuração OFICIAL copiada do painel
const firebaseConfig = {
  apiKey: "AIzaSyAO-XyaXaPA5KbQo_Pue48-FXYnOGDH99s",
  authDomain: "pwa-top-telecom.firebaseapp.com",
  projectId: "pwa-top-telecom",
  storageBucket: "pwa-top-telecom.firebasestorage.app",
  messagingSenderId: "268860893450",
  appId: "1:268860893450:web:c4875d8a97f446a62bb2f3"
};

// Inicializando o aplicativo e o sistema de Login
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Pegando os elementos da tela
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');

// MÁGICA DO LOGIN
loginBtn.addEventListener('click', () => {
    // Mostra que está carregando
    const textoOriginal = loginBtn.innerHTML;
    loginBtn.innerHTML = "Carregando...";

    signInWithPopup(auth, provider)
        .then((result) => {
            // Sucesso! O usuário logou.
            const user = result.user;
            console.log("Usuário logado com sucesso:", user.displayName);
            
            // Troca as telas
            loginSection.classList.remove('active');
            loginSection.classList.add('hidden');
            
            dashboardSection.classList.remove('hidden');
            dashboardSection.classList.add('active');
            
            // Restaura o botão original
            loginBtn.innerHTML = textoOriginal;
        }).catch((error) => {
            // Se der erro
            console.error("Erro no login:", error);
            alert("O login foi cancelado ou ocorreu um erro.");
            loginBtn.innerHTML = textoOriginal;
        });
});

// MÁGICA DO LOGOUT
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Sucesso ao deslogar, volta para a tela inicial
        dashboardSection.classList.remove('active');
        dashboardSection.classList.add('hidden');
        
        loginSection.classList.remove('hidden');
        loginSection.classList.add('active');
    });
});
