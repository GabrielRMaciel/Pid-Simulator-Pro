export class Visualization {
    constructor(canvasId) {
        this.MAX_DATA_POINTS = 300; // Limite de pontos no gráfico
        this.simulationTime = 0;

        const ctx = document.getElementById(canvasId).getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Variável de Processo (PV)',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 2,
                        tension: 0.1,
                        pointRadius: 0
                    },
                    {
                        label: 'Setpoint (SP)',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.1,
                        pointRadius: 0
                    },
                    {
                        label: 'Variável Manipulada (MV %)',
                        data: [],
                        borderColor: 'rgb(54, 162, 235)',
                        borderWidth: 1.5,
                        tension: 0.1,
                        pointRadius: 0,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Tempo (s)' }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Valor do Processo' }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Saída (%)' },
                        min: -110,
                        max: 110,
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });

        // 🔹 Garante que o canvas nunca ultrapasse o container
        const canvas = document.getElementById(canvasId);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
    }

    /**
     * Adiciona novos pontos de dados e mantém o tamanho máximo do histórico
     */
    update(pv, sp, mv, dt) {
        this.simulationTime += dt;
        const time = this.simulationTime.toFixed(2);

        this.chart.data.labels.push(parseFloat(time));
        this.chart.data.datasets[0].data.push(pv);
        this.chart.data.datasets[1].data.push(sp);
        this.chart.data.datasets[2].data.push(mv);

        // 🔹 Mantém no máximo MAX_DATA_POINTS
        if (this.chart.data.labels.length > this.MAX_DATA_POINTS) {
            this.chart.data.labels.shift();
            this.chart.data.datasets.forEach(dataset => dataset.data.shift());
        }

        this.chart.update();
    }
}
