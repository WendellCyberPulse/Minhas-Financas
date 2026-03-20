// ===== CONFIGURAÇÃO DO SUPABASE =====
const SUPABASE_URL = 'https://shasxxvfucjsxpcmroqr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0pnCWSc3IcaO8OP0Eqtvjg_2Ydxnszb';

// Verificar se a biblioteca foi carregada
if (typeof supabase === 'undefined') {
    console.error("❌ Biblioteca Supabase não carregada!");
} else {
    // Criar o cliente Supabase
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase configurado com sucesso!");
}

// Funções de autenticação usando o cliente global
async function verificarAutenticacao() {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase client não disponível");
            return null;
        }
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        const paginasPublicas = ['/login.html', '/index.html'];
        const currentPage = window.location.pathname;
        
        if (!session && !paginasPublicas.includes(currentPage)) {
            window.location.href = '/login.html';
        }
        return session;
    } catch (error) {
        console.error("Erro na autenticação:", error);
        return null;
    }
}

async function fazerLogin(email, senha) {
    try {
        if (!window.supabaseClient) throw new Error("Cliente não inicializado");
        
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });
        
        if (error) throw error;
        
        alert('✅ Login realizado!');
        window.location.href = '/index.html';
        return data;
    } catch (error) {
        alert('❌ ' + error.message);
        return null;
    }
}

async function criarConta(email, senha) {
    try {
        if (!window.supabaseClient) throw new Error("Cliente não inicializado");
        
        const { data, error } = await window.supabaseClient.auth.signUp({
            email: email,
            password: senha
        });
        
        if (error) throw error;
        
        alert('✅ Conta criada! Verifique seu email.');
        return data;
    } catch (error) {
        alert('❌ ' + error.message);
        return null;
    }
}

async function fazerLogout() {
    try {
        if (!window.supabaseClient) throw new Error("Cliente não inicializado");
        
        await window.supabaseClient.auth.signOut();
        alert('✅ Logout realizado!');
        window.location.href = '/index.html';
    } catch (error) {
        alert('❌ Erro ao fazer logout: ' + error.message);
    }
}

// Expor as funções globalmente
window.verificarAutenticacao = verificarAutenticacao;
window.fazerLogin = fazerLogin;
window.criarConta = criarConta;
window.fazerLogout = fazerLogout;

console.log("✅ Funções de autenticação carregadas!");