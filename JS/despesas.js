// ========== DESPESAS ==========
console.log("📝 Página de despesas carregada");

document.addEventListener('DOMContentLoaded', function() {
    const formFamilia = document.getElementById('formFamilia');
    const formIndividual = document.getElementById('formIndividual');
    
    if (!formFamilia && !formIndividual) return; // Sai se não for página de despesas
    
    console.log("✅ Inicializando despesas...");
    
    let despesas = [];
    const listaDespesas = document.getElementById('listaDespesas');
    const totalDespesasElement = document.getElementById('totalDespesas');
    const totalFamiliaElement = document.getElementById('totalFamilia');
    const totalIndividualElement = document.getElementById('totalIndividual');
    const acertosContainer = document.getElementById('acertosContainer'); // NOVO

    // ===== FUNÇÕES DE APOIO =====
    function carregarBancosNoSelect() {
        const selects = document.querySelectorAll('.select-banco');
        const bancos = JSON.parse(localStorage.getItem('bancos')) || [];
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Selecione um banco...</option>';
            
            if (bancos.length === 0) {
                select.innerHTML += '<option value="" disabled>❌ Nenhum banco cadastrado</option>';
            } else {
                bancos.forEach(banco => {
                    const option = document.createElement('option');
                    option.value = banco.nome;
                    option.textContent = `${banco.nome} (${formatarMoeda(banco.saldo)})`;
                    select.appendChild(option);
                });
            }
        });
    }

    function carregarCartoesNoSelect() {
        const selects = document.querySelectorAll('.select-cartao');
        const cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Selecione um cartão...</option>';
            
            if (cartoes.length === 0) {
                select.innerHTML += '<option value="" disabled>❌ Nenhum cartão cadastrado</option>';
            } else {
                cartoes.forEach(cartao => {
                    const disponivel = (cartao.limite || 0) - (cartao.usado || 0);
                    const option = document.createElement('option');
                    option.value = cartao.nome;
                    option.textContent = `${cartao.nome} (disp: ${formatarMoeda(disponivel)})`;
                    select.appendChild(option);
                });
            }
        });
    }

    function carregarPessoasNoSelect() {
        // Pega pessoas cadastradas (pode vir do localStorage futuramente)
        const pessoas = ['João', 'Maria', 'Você'];
        const selects = document.querySelectorAll('.select-pagador');
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Quem pagou?</option>';
            pessoas.forEach(pessoa => {
                const option = document.createElement('option');
                option.value = pessoa;
                option.textContent = pessoa;
                select.appendChild(option);
            });
        });
    }

    // ===== FUNÇÕES DE ATUALIZAÇÃO DE SALDO =====
    function atualizarSaldoBanco(nomeBanco, valor, operacao = 'remover') {
        let bancos = JSON.parse(localStorage.getItem('bancos')) || [];
        
        bancos = bancos.map(banco => {
            if (banco.nome.toLowerCase().trim() === nomeBanco.toLowerCase().trim()) {
                if (operacao === 'adicionar') {
                    banco.saldo = (banco.saldo || 0) + valor;
                } else {
                    banco.saldo = (banco.saldo || 0) - valor;
                }
            }
            return banco;
        });
        
        localStorage.setItem('bancos', JSON.stringify(bancos));
    }

    function atualizarLimiteCartao(nomeCartao, valor, operacao = 'adicionar') {
        let cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
        
        cartoes = cartoes.map(cartao => {
            if (cartao.nome.toLowerCase().trim() === nomeCartao.toLowerCase().trim()) {
                cartao.usado = (cartao.usado || 0) + (operacao === 'adicionar' ? valor : -valor);
            }
            return cartao;
        });
        
        localStorage.setItem('cartoes', JSON.stringify(cartoes));
    }

    // ===== FUNÇÕES DE ATUALIZAÇÃO DA TELA =====
    function atualizarListaDespesas() {
        if (!listaDespesas) return;
        
        // Ordenar por data (mais recente primeiro)
        const despesasOrdenadas = [...despesas].sort((a, b) => new Date(b.data) - new Date(a.data));
        
        listaDespesas.innerHTML = '';
        
        despesasOrdenadas.forEach(despesa => {
            const item = document.createElement('div');
            item.className = 'lista-item';
            
            const statusClass = despesa.paga ? 'status-pago' : 'status-pendente';
            const statusText = despesa.paga ? '✅ Pago' : '⏳ Pendente';
            const valorFormatado = formatarMoeda(despesa.valorTotal || despesa.valor);
            
            item.innerHTML = `
                <span>${formatarData(despesa.data)}</span>
                <span>${despesa.descricao}</span>
                <span>${despesa.tipo === 'familia' ? '👥 Família' : '👤 Individual'}</span>
                <span>${valorFormatado}</span>
                <span class="${statusClass}">${statusText}</span>
                <span>
                    <button class="btn-pagar" onclick="marcarComoPaga(${despesa.id})" ${despesa.paga ? 'disabled' : ''}>💰 Pagar</button>
                    <button class="btn-editar" onclick="editarDespesa(${despesa.id})">✏️</button>
                    <button class="btn-excluir" onclick="excluirDespesa(${despesa.id})">🗑️</button>
                </span>
            `;
            
            listaDespesas.appendChild(item);
        });
    }

    function atualizarResumoDespesas() {
        let totalGeral = 0;
        let totalFamilia = 0;
        let totalIndividual = 0;
        
        despesas.forEach(despesa => {
            // Só considera despesas pagas no total? Ou todas?
            const valor = despesa.valorTotal || despesa.valor || 0;
            totalGeral += valor;
            
            if (despesa.tipo === 'familia') {
                totalFamilia += valor;
            } else {
                totalIndividual += valor;
            }
        });
        
        if (totalDespesasElement) {
            totalDespesasElement.textContent = formatarMoeda(totalGeral);
        }
        if (totalFamiliaElement) {
            totalFamiliaElement.textContent = formatarMoeda(totalFamilia);
        }
        if (totalIndividualElement) {
            totalIndividualElement.textContent = formatarMoeda(totalIndividual);
        }
    }

    function calcularAcertos() {
        if (!acertosContainer) return;
        
        // Mapa de pessoas: quem pagou quanto e quem deve quanto
        const pessoas = {};
        
        despesas.forEach(despesa => {
            if (despesa.tipo === 'familia' && despesa.paga) {
                const total = despesa.valorTotal;
                const divididoPor = despesa.divisao || 3;
                const valorPorPessoa = total / divididoPor;
                
                // Quem pagou tem a receber dos outros
                if (!pessoas[despesa.pagador]) {
                    pessoas[despesa.pagador] = { paga: 0, recebe: 0 };
                }
                
                // Os outros devem para quem pagou
                for (let i = 0; i < divididoPor; i++) {
                    const pessoa = despesa.participantes[i];
                    if (pessoa !== despesa.pagador) {
                        if (!pessoas[pessoa]) {
                            pessoas[pessoa] = { paga: 0, recebe: 0 };
                        }
                        pessoas[pessoa].paga += valorPorPessoa;
                    }
                }
                pessoas[despesa.pagador].recebe += valorPorPessoa * (divididoPor - 1);
            }
        });
        
        // Gerar HTML dos acertos
        let html = '<div class="cards-container">';
        
        Object.keys(pessoas).forEach(pessoa => {
            const saldo = pessoas[pessoa].recebe - pessoas[pessoa].paga;
            const classe = saldo > 0 ? 'status-pago' : 'status-pendente';
            
            html += `
                <div class="card">
                    <h3>${pessoa}</h3>
                    <p class="${classe}">${formatarMoeda(Math.abs(saldo))}</p>
                    <small>${saldo > 0 ? '💰 A receber' : '💸 Deve pagar'}</small>
                </div>
            `;
        });
        
        html += '</div>';
        acertosContainer.innerHTML = html;
    }

    // ===== FUNÇÕES DE CRUD =====
    function carregarDespesas() {
        const dadosSalvos = localStorage.getItem('despesas');
        if (dadosSalvos) {
            despesas = JSON.parse(dadosSalvos);
            atualizarListaDespesas();
            atualizarResumoDespesas();
            calcularAcertos();
        }
        carregarBancosNoSelect();
        carregarCartoesNoSelect();
        carregarPessoasNoSelect();
    }

    function salvarDespesas() {
        localStorage.setItem('despesas', JSON.stringify(despesas));
    }

    // ===== FUNÇÃO PARA CADASTRAR DESPESA (FAMÍLIA) =====
    function cadastrarDespesaFamilia(evento) {
        evento.preventDefault();
        
        const descricao = document.getElementById('descFamilia').value.trim();
        const valorTotal = parseFloat(document.getElementById('valorFamilia').value) || 0;
        const data = document.getElementById('dataFamilia').value;
        const divisao = parseInt(document.getElementById('divisaoFamilia').value) || 3;
        const pagador = document.getElementById('pagadorFamilia').value;
        const pagamento = document.getElementById('pagamentoFamilia').value;
        const banco = document.getElementById('bancoFamilia').value;
        const cartao = document.getElementById('cartaoFamilia').value;
        
        // Validações
        if (!descricao || valorTotal <= 0 || !data || !pagador || !pagamento) {
            alert('❌ Preencha todos os campos obrigatórios!');
            return;
        }
        
        if (pagamento === 'debito' && !banco) {
            alert('❌ Selecione o banco para débito!');
            return;
        }
        
        if (pagamento === 'credito' && !cartao) {
            alert('❌ Selecione o cartão de crédito!');
            return;
        }
        
        // Criar lista de participantes (simplificado)
        const participantes = ['João', 'Maria', 'Você'].slice(0, divisao);
        
        const novaDespesa = {
            id: Date.now(),
            tipo: 'familia',
            descricao: descricao,
            valorTotal: valorTotal,
            valorPorPessoa: valorTotal / divisao,
            data: data,
            divisao: divisao,
            participantes: participantes,
            pagador: pagador,
            pagamento: pagamento,
            banco: pagamento === 'debito' ? banco : null,
            cartao: pagamento === 'credito' ? cartao : null,
            paga: false // Começa como não paga
        };
        
        let despesasExistentes = JSON.parse(localStorage.getItem('despesas')) || [];
        despesasExistentes.push(novaDespesa);
        localStorage.setItem('despesas', JSON.stringify(despesasExistentes));
        
        // Recarrega dados
        despesas = despesasExistentes;
        atualizarListaDespesas();
        atualizarResumoDespesas();
        
        // Limpa formulário
        document.getElementById('descFamilia').value = '';
        document.getElementById('valorFamilia').value = '';
        document.getElementById('dataFamilia').value = '';
        document.getElementById('divisaoFamilia').value = '3';
        document.getElementById('pagadorFamilia').value = '';
        document.getElementById('pagamentoFamilia').value = 'dinheiro';
        document.getElementById('bancoFamilia').value = '';
        document.getElementById('cartaoFamilia').value = '';
        
        console.log('Despesa familiar cadastrada:', novaDespesa);
    }

    // ===== FUNÇÃO PARA CADASTRAR DESPESA (INDIVIDUAL) =====
    function cadastrarDespesaIndividual(evento) {
        evento.preventDefault();
        
        const descricao = document.getElementById('descIndividual').value.trim();
        const valor = parseFloat(document.getElementById('valorIndividual').value) || 0;
        const data = document.getElementById('dataIndividual').value;
        const categoria = document.getElementById('categoriaIndividual').value;
        const pagamento = document.getElementById('pagamentoIndividual').value;
        const banco = document.getElementById('bancoIndividual').value;
        const cartao = document.getElementById('cartaoIndividual').value;
        
        // Validações
        if (!descricao || valor <= 0 || !data || !categoria || !pagamento) {
            alert('❌ Preencha todos os campos obrigatórios!');
            return;
        }
        
        if (pagamento === 'debito' && !banco) {
            alert('❌ Selecione o banco para débito!');
            return;
        }
        
        if (pagamento === 'credito' && !cartao) {
            alert('❌ Selecione o cartão de crédito!');
            return;
        }
        
        const novaDespesa = {
            id: Date.now(),
            tipo: 'individual',
            descricao: descricao,
            valor: valor,
            data: data,
            categoria: categoria,
            pagamento: pagamento,
            banco: pagamento === 'debito' ? banco : null,
            cartao: pagamento === 'credito' ? cartao : null,
            paga: false // Começa como não paga
        };
        
        let despesasExistentes = JSON.parse(localStorage.getItem('despesas')) || [];
        despesasExistentes.push(novaDespesa);
        localStorage.setItem('despesas', JSON.stringify(despesasExistentes));
        
        despesas = despesasExistentes;
        atualizarListaDespesas();
        atualizarResumoDespesas();
        
        // Limpa formulário
        document.getElementById('descIndividual').value = '';
        document.getElementById('valorIndividual').value = '';
        document.getElementById('dataIndividual').value = '';
        document.getElementById('categoriaIndividual').value = 'alimentacao';
        document.getElementById('pagamentoIndividual').value = 'dinheiro';
        document.getElementById('bancoIndividual').value = '';
        document.getElementById('cartaoIndividual').value = '';
        
        console.log('Despesa individual cadastrada:', novaDespesa);
    }

    // ===== EVENTOS =====
    if (formFamilia) {
        formFamilia.addEventListener('submit', cadastrarDespesaFamilia);
    }
    
    if (formIndividual) {
        formIndividual.addEventListener('submit', cadastrarDespesaIndividual);
    }

    // Eventos para mostrar/esconder campos de banco/cartão
    document.getElementById('pagamentoFamilia')?.addEventListener('change', function() {
        const divBanco = document.getElementById('containerBancoFamilia');
        const divCartao = document.getElementById('containerCartaoFamilia');
        
        if (this.value === 'debito') {
            divBanco.style.display = 'block';
            divCartao.style.display = 'none';
        } else if (this.value === 'credito') {
            divBanco.style.display = 'none';
            divCartao.style.display = 'block';
        } else {
            divBanco.style.display = 'none';
            divCartao.style.display = 'none';
        }
    });

    document.getElementById('pagamentoIndividual')?.addEventListener('change', function() {
        const divBanco = document.getElementById('containerBancoIndividual');
        const divCartao = document.getElementById('containerCartaoIndividual');
        
        if (this.value === 'debito') {
            divBanco.style.display = 'block';
            divCartao.style.display = 'none';
        } else if (this.value === 'credito') {
            divBanco.style.display = 'none';
            divCartao.style.display = 'block';
        } else {
            divBanco.style.display = 'none';
            divCartao.style.display = 'none';
        }
    });

    // Carregar dados iniciais
    carregarDespesas();
});

// ===== FUNÇÕES GLOBAIS =====

// Marcar despesa como paga
window.marcarComoPaga = function(id) {
    if (!confirm('Confirmar pagamento desta despesa?')) return;
    
    let despesas = JSON.parse(localStorage.getItem('despesas')) || [];
    const despesa = despesas.find(d => d.id === id);
    
    if (!despesa || despesa.paga) return;
    
    // Marcar como paga
    despesa.paga = true;
    
    // Pega o valor (pode ser valorTotal para família ou valor para individual)
    const valor = despesa.valorTotal || despesa.valor || 0;
    
    // Se for débito, remove do banco
    if (despesa.pagamento === 'debito' && despesa.banco) {
        let bancos = JSON.parse(localStorage.getItem('bancos')) || [];
        
        bancos = bancos.map(b => {
            if (b.nome.toLowerCase().trim() === despesa.banco.toLowerCase().trim()) {
                b.saldo = (b.saldo || 0) - valor;
                console.log(`✅ Débito: ${formatarMoeda(valor)} removido de ${b.nome}`);
            }
            return b;
        });
        localStorage.setItem('bancos', JSON.stringify(bancos));
    }
    
    // Se for crédito, adiciona ao usado do cartão
    if (despesa.pagamento === 'credito' && despesa.cartao) {
        let cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
        let cartaoEncontrado = false;
        
        cartoes = cartoes.map(c => {
            if (c.nome.toLowerCase().trim() === despesa.cartao.toLowerCase().trim()) {
                c.usado = (c.usado || 0) + valor;
                console.log(`✅ Crédito: ${formatarMoeda(valor)} adicionado ao usado de ${c.nome}`);
                cartaoEncontrado = true;
            }
            return c;
        });
        
        if (!cartaoEncontrado) {
            console.warn(`⚠️ Cartão "${despesa.cartao}" não encontrado`);
        }
        
        localStorage.setItem('cartoes', JSON.stringify(cartoes));
    }
    
    // Salva despesas atualizadas
    localStorage.setItem('despesas', JSON.stringify(despesas));
    
    console.log('✅ Despesa marcada como paga:', despesa);
    location.reload();
}

// Excluir despesa
window.excluirDespesa = function(id) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    
    let despesas = JSON.parse(localStorage.getItem('despesas')) || [];
    despesas = despesas.filter(d => d.id !== id);
    localStorage.setItem('despesas', JSON.stringify(despesas));
    
    location.reload();
}

// Editar despesa
window.editarDespesa = function(id) {
    if (!confirm('Deseja editar esta despesa?')) return;
    
    let despesas = JSON.parse(localStorage.getItem('despesas')) || [];
    const despesa = despesas.find(d => d.id === id);
    
    if (!despesa) return;
    
    if (despesa.tipo === 'familia') {
        // Preencher formulário família
        document.getElementById('descFamilia').value = despesa.descricao;
        document.getElementById('valorFamilia').value = despesa.valorTotal;
        document.getElementById('dataFamilia').value = despesa.data;
        document.getElementById('divisaoFamilia').value = despesa.divisao;
        document.getElementById('pagadorFamilia').value = despesa.pagador;
        document.getElementById('pagamentoFamilia').value = despesa.pagamento;
        
        // Mostrar campo correto (banco/cartão)
        if (despesa.pagamento === 'debito' && despesa.banco) {
            document.getElementById('containerBancoFamilia').style.display = 'block';
            document.getElementById('bancoFamilia').value = despesa.banco;
        } else if (despesa.pagamento === 'credito' && despesa.cartao) {
            document.getElementById('containerCartaoFamilia').style.display = 'block';
            document.getElementById('cartaoFamilia').value = despesa.cartao;
        }
        
        // Rolar até o formulário
        document.getElementById('formFamilia').scrollIntoView({ behavior: 'smooth' });
        
    } else {
        // Preencher formulário individual
        document.getElementById('descIndividual').value = despesa.descricao;
        document.getElementById('valorIndividual').value = despesa.valor;
        document.getElementById('dataIndividual').value = despesa.data;
        document.getElementById('categoriaIndividual').value = despesa.categoria;
        document.getElementById('pagamentoIndividual').value = despesa.pagamento;
        
        // Mostrar campo correto
        if (despesa.pagamento === 'debito' && despesa.banco) {
            document.getElementById('containerBancoIndividual').style.display = 'block';
            document.getElementById('bancoIndividual').value = despesa.banco;
        } else if (despesa.pagamento === 'credito' && despesa.cartao) {
            document.getElementById('containerCartaoIndividual').style.display = 'block';
            document.getElementById('cartaoIndividual').value = despesa.cartao;
        }
        
        document.getElementById('formIndividual').scrollIntoView({ behavior: 'smooth' });
    }
    
    // Remover despesa antiga
    const novasDespesas = despesas.filter(d => d.id !== id);
    localStorage.setItem('despesas', JSON.stringify(novasDespesas));
    
    // Guardar ID para referência
    sessionStorage.setItem('editandoDespesaId', id);
    sessionStorage.setItem('editandoDespesaTipo', despesa.tipo);
    
    // Mudar texto dos botões
    if (despesa.tipo === 'familia') {
        document.querySelector('#formFamilia button[type="submit"]').textContent = '✏️ Atualizar despesa familiar';
    } else {
        document.querySelector('#formIndividual button[type="submit"]').textContent = '✏️ Atualizar despesa individual';
    }
}

// Função para cancelar edição
window.cancelarEdicaoDespesa = function(tipo) {
    if (confirm('Cancelar edição?')) {
        sessionStorage.removeItem('editandoDespesaId');
        sessionStorage.removeItem('editandoDespesaTipo');
        
        if (tipo === 'familia') {
            document.getElementById('formFamilia').reset();
            document.getElementById('containerBancoFamilia').style.display = 'none';
            document.getElementById('containerCartaoFamilia').style.display = 'none';
            document.querySelector('#formFamilia button[type="submit"]').textContent = '✅ Cadastrar despesa da família';
        } else {
            document.getElementById('formIndividual').reset();
            document.getElementById('containerBancoIndividual').style.display = 'none';
            document.getElementById('containerCartaoIndividual').style.display = 'none';
            document.querySelector('#formIndividual button[type="submit"]').textContent = '✅ Cadastrar despesa individual';
        }
    }
}