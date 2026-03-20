// ========== SCRIPT GLOBAL ==========
console.log("✅ Script global carregado!");

// ========== FUNÇÕES GLOBAIS DE FORMATAÇÃO ==========

// Formatar moeda brasileira (R$ 1.234,56)
function formatarMoeda(valor) {
    if (isNaN(valor)) valor = 0;
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Formatar número sem símbolo (1.234,56)
function formatarNumero(valor) {
    if (isNaN(valor)) valor = 0;
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Formatar data brasileira (dd/mm/aaaa)
function formatarData(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

// ========== TEMA ==========
console.log("🌙 Modo noturno ativo");

// ========== UTILIDADES GLOBAIS ==========

// Mostrar mensagem de sucesso
function mostrarSucesso(mensagem) {
    alert('✅ ' + mensagem);
}

// Mostrar mensagem de erro
function mostrarErro(mensagem) {
    alert('❌ ' + mensagem);
}

// Confirmar ação
function confirmarAcao(mensagem) {
    return confirm('⚠️ ' + mensagem);
}

// ===== AUTENTICAÇÃO (CORRIGIDO) =====
async function carregarDadosUsuario() {
    // Usar o cliente global que criamos no supabase-config.js
    if (!window.supabaseClient) {
        console.error("❌ Supabase client não disponível!");
        return null;
    }
    
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            console.log('✅ Usuário logado:', session.user.email);
            return session.user.id;
        }
        console.log('⚠️ Nenhum usuário logado');
        return null;
    } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        return null;
    }
}

// Chamar no início de cada página (com tratamento de erro)
carregarDadosUsuario().catch(console.error);