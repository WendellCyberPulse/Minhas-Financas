// ========== DASHBOARD ==========
console.log("🏠 Página inicial carregada");

document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ Inicializando dashboard...");
    
    // ===== ELEMENTOS DO DASHBOARD =====
    const elementos = {
        // Resumo Geral
        saldoBancos: document.getElementById('resumoSaldoBancos'),
        limiteCartoes: document.getElementById('resumoLimiteCartoes'),
        totalDespesas: document.getElementById('resumoTotalDespesas'),
        
        // Despesas por Categoria
        totalFamilia: document.getElementById('dashboardTotalFamilia'),
        totalIndividual: document.getElementById('dashboardTotalIndividual'),
        
        // Últimas Despesas
        ultimasDespesas: document.getElementById('ultimasDespesas')
    };
    
   // ===== FUNÇÃO PARA ATUALIZAR O DASHBOARD =====
function atualizarDashboard() {
    console.log("Atualizando dashboard...");
    
    // 1. Buscar dados do localStorage
    const bancos = JSON.parse(localStorage.getItem('bancos')) || [];
    const cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
    const receitas = JSON.parse(localStorage.getItem('receitas')) || [];
    const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
    
    // 2. Calcular totais
    const saldoTotalBancos = bancos.reduce((acc, b) => acc + (b.saldo || 0), 0);
    const limiteTotalCartoes = cartoes.reduce((acc, c) => acc + (c.limite || 0), 0);
    const usadoTotalCartoes = cartoes.reduce((acc, c) => acc + (c.usado || 0), 0);
    const limiteDisponivel = limiteTotalCartoes - usadoTotalCartoes;
    
    // 3. Despesas do mês atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    let totalDespesasMes = 0;
    let totalFamiliaMes = 0;
    let totalIndividualMes = 0;

    despesas.forEach(d => {
        const dataDespesa = new Date(d.data);
        if (dataDespesa.getMonth() === mesAtual && dataDespesa.getFullYear() === anoAtual) {
            const valor = d.valorTotal || d.valor || 0;
            totalDespesasMes += valor;
            
            if (d.tipo === 'familia') {
                totalFamiliaMes += valor;
            } else {
                totalIndividualMes += valor;
            }
        }
    });

    console.log(`📊 Despesas do mês: ${formatarMoeda(totalDespesasMes)}`);
    console.log(`👥 Família: ${formatarMoeda(totalFamiliaMes)}`);
    console.log(`👤 Individual: ${formatarMoeda(totalIndividualMes)}`);
    
    // 4. Atualizar elementos na tela
    if (elementos.saldoBancos) {
        elementos.saldoBancos.textContent = formatarMoeda(saldoTotalBancos);
    }
    
    if (elementos.limiteCartoes) {
        elementos.limiteCartoes.textContent = formatarMoeda(limiteDisponivel);
    }
    
    if (elementos.totalDespesas) {
        elementos.totalDespesas.textContent = formatarMoeda(totalDespesasMes);
    }
    
    if (elementos.totalFamilia) {
        elementos.totalFamilia.textContent = formatarMoeda(totalFamiliaMes);
    }
    
    if (elementos.totalIndividual) {
        elementos.totalIndividual.textContent = formatarMoeda(totalIndividualMes);
    }
    
    // 5. Mostrar últimas 5 despesas
    mostrarUltimasDespesas(despesas);

    // 6. ✅ CRIAR GRÁFICOS COM OS DADOS
    criarGraficos(despesas, bancos, saldoTotalBancos);
}
    
    // ===== FUNÇÃO PARA MOSTRAR ÚLTIMAS DESPESAS =====
    function mostrarUltimasDespesas(despesas) {
        if (!elementos.ultimasDespesas) return;
        
        // Ordenar por data (mais recente primeiro) e pegar as 5 primeiras
        const ultimas = [...despesas]
            .sort((a, b) => new Date(b.data) - new Date(a.data))
            .slice(0, 5);
        
        elementos.ultimasDespesas.innerHTML = '';
        
        if (ultimas.length === 0) {
            elementos.ultimasDespesas.innerHTML = `
                <div class="lista-item">
                    <span colspan="4" style="text-align: center; color: #888;">
                        Nenhuma despesa cadastrada
                    </span>
                </div>
            `;
            return;
        }
        
        ultimas.forEach(despesa => {
            const item = document.createElement('div');
            item.className = 'lista-item';
            
            const valor = despesa.valorTotal || despesa.valor || 0;
            const tipo = despesa.tipo === 'familia' ? '👥 Família' : '👤 Individual';
            const status = despesa.paga ? '✅' : '⏳';
            
            item.innerHTML = `
                <span>${formatarData(despesa.data)}</span>
                <span>${despesa.descricao}</span>
                <span>${tipo}</span>
                <span>${formatarMoeda(valor)} ${status}</span>
            `;
            
            elementos.ultimasDespesas.appendChild(item);
        });
    }
    
    // ===== FUNÇÃO PARA MOSTRAR RECEITAS DO MÊS (OPCIONAL) =====
    function mostrarReceitasMes() {
        const receitas = JSON.parse(localStorage.getItem('receitas')) || [];
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        const receitasMes = receitas.filter(r => {
            const data = new Date(r.data);
            return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
        });
        
        const totalReceitasMes = receitasMes.reduce((acc, r) => acc + (r.valor || 0), 0);
        
        // Se quiser mostrar em algum lugar
        console.log(`Receitas do mês: ${formatarMoeda(totalReceitasMes)}`);
    }
    
    // ===== ATUALIZAR A CADA 30 SEGUNDOS (OPCIONAL) =====
    atualizarDashboard();
    setInterval(atualizarDashboard, 30000); // Atualiza a cada 30s
});

// ===== FUNÇÕES DE GRÁFICOS =====
function criarGraficos(despesas, bancos, saldoTotalBancos) {
    console.log("🎨 Criando gráficos com dados:", despesas);
    
    // Destruir gráficos anteriores se existirem
    if (window.graficos) {
        window.graficos.forEach(g => g.destroy());
    }
    window.graficos = [];

    

    // 1. GRÁFICO DE PIZZA
    const ctxPizza = document.getElementById('graficoPizza')?.getContext('2d');
    if (ctxPizza && despesas.length > 0) {
        const categorias = {};
        despesas.forEach(d => {
            const categoria = d.categoria || (d.tipo === 'familia' ? 'Família' : 'Individual');
            const valor = d.valorTotal || d.valor || 0;
            categorias[categoria] = (categorias[categoria] || 0) + valor;
        });

        console.log("🥧 Dados pizza:", categorias);

        const grafico = new Chart(ctxPizza, {
            type: 'pie',
            data: {
                labels: Object.keys(categorias),
                datasets: [{
                    data: Object.values(categorias),
                    backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                }
            }
        });
        window.graficos.push(grafico);
    }

    // 2. GRÁFICO DE BARRAS
    const ctxBarras = document.getElementById('graficoBarras')?.getContext('2d');
    if (ctxBarras) {
        const meses = [];
        const valoresFamilia = [];
        const valoresIndividual = [];
        
        for (let i = 5; i >= 0; i--) {
            const data = new Date();
            data.setMonth(data.getMonth() - i);
            const mes = data.toLocaleString('pt-BR', { month: 'short' });
            meses.push(mes);
            
            let totalFamilia = 0;
            let totalIndividual = 0;
            
            despesas.forEach(d => {
                const dataDespesa = new Date(d.data);
                if (dataDespesa.getMonth() === data.getMonth() && 
                    dataDespesa.getFullYear() === data.getFullYear()) {
                    const valor = d.valorTotal || d.valor || 0;
                    if (d.tipo === 'familia') {
                        totalFamilia += valor;
                    } else {
                        totalIndividual += valor;
                    }
                }
            });
            
            valoresFamilia.push(totalFamilia);
            valoresIndividual.push(totalIndividual);
        }

        console.log("📊 Dados barras:", { meses, valoresFamilia, valoresIndividual });

        const grafico = new Chart(ctxBarras, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [
                    { label: 'Família', data: valoresFamilia, backgroundColor: '#ff6384' },
                    { label: 'Individual', data: valoresIndividual, backgroundColor: '#36a2eb' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                },
                scales: {
                    y: { ticks: { color: '#fff' } },
                    x: { ticks: { color: '#fff' } }
                }
            }
        });
        window.graficos.push(grafico);
    }

    // 3. GRÁFICO DE LINHA

    
    const ctxLinha = document.getElementById('graficoLinha')?.getContext('2d');
    if (ctxLinha) {
        const dias = [];
        const despesasDiarias = [];
        
        for (let i = 6; i >= 0; i--) {
            const data = new Date();
            data.setDate(data.getDate() - i);
            const dia = data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' });
            dias.push(dia);
            
            let totalDia = 0;
            despesas.forEach(d => {
                const dataDespesa = new Date(d.data);
                if (dataDespesa.toDateString() === data.toDateString()) {
                    totalDia += (d.valorTotal || d.valor || 0);
                }
            });
            despesasDiarias.push(totalDia);
        }

        console.log("📈 Dados linha:", { dias, despesasDiarias });

        const grafico = new Chart(ctxLinha, {
            type: 'line',
            data: {
                labels: dias,
                datasets: [
                    {
                        label: 'Despesas',
                        data: despesasDiarias,
                        borderColor: '#ff6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.1,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                },
                scales: {
                    y: { ticks: { color: '#fff' } },
                    x: { ticks: { color: '#fff' } }
                }
            }
        });
        window.graficos.push(grafico);
        
    }
}

// Chamar a função depois de atualizar os dados
criarGraficos();