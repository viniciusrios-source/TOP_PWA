// Importações do Firebase direto da nuvem
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// A sua chave de configuração do Firebase (com o número ZERO)
const firebaseConfig = {
  apiKey: "AIzaSyA0-XyaXaPA5KbQo_Pue48-FXYn0GDH99s",
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
    const textoOriginal = loginBtn.innerHTML;
    loginBtn.innerHTML = "Carregando...";

    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log("Usuário logado com sucesso:", user.displayName);
            
            loginSection.classList.remove('active');
            loginSection.classList.add('hidden');
            
            dashboardSection.classList.remove('hidden');
            dashboardSection.classList.add('active');
            
            loginBtn.innerHTML = textoOriginal;
        }).catch((error) => {
            console.error("Erro no login:", error);
            alert("O login foi cancelado ou ocorreu um erro.");
            loginBtn.innerHTML = textoOriginal;
        });
});

// MÁGICA DO LOGOUT
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        dashboardSection.classList.remove('active');
        dashboardSection.classList.add('hidden');
        
        loginSection.classList.remove('hidden');
        loginSection.classList.add('active');
    });
});
