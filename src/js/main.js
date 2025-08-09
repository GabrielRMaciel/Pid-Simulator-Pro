import { AdvancedPIDController } from './advanced-pid.js';
import { MechanicalSystem } from './plant-models.js';
import { TemperatureControlSystem, TankLevelSystem, MotorSpeedSystem, PressureControlSystem } from './industrial-plants.js';
import { PerformanceAnalyzer } from './performance-analyzer.js';
import { SmartTipsSystem } from './smart-tips.js';
import { EducationalScenarios } from './educational-scenarios.js';

class SimulationApp {
    constructor() {
        this.ui = {
            // Controles PID
            kpSlider: document.getElementById('kp-slider'),
            kiSlider: document.getElementById('ki-slider'),
            kdSlider: document.getElementById('kd-slider'),
            kpValue: document.getElementById('kp-value'),
            kiValue: document.getElementById('ki-value'),
            kdValue: document.getElementById('kd-value'),

            // Controles Avançados
            plantSelector: document.getElementById('plant-selector'),
            setpointSlider: document.getElementById('setpoint-slider'),
            setpointValue: document.getElementById('setpoint-value'),

            // Ações
            resetButton: document.getElementById('reset-button'),
            disturbanceButton: document.getElementById('disturbance-button'),
            noiseButton: document.getElementById('noise-button'),
            delayButton: document.getElementById('delay-button'),

            // Controles de Condições Reais
            noiseSlider: document.getElementById('noise-slider'),
            delaySlider: document.getElementById('delay-slider'),
            noiseValue: document.getElementById('noise-value'),
            delayValue: document.getElementById('delay-value'),

            // Presets
            presetButtons: document.querySelectorAll('.preset-card'),

            // Gráfico
            pidChartCanvas: document.getElementById('pidChart'),

            // Métricas
            currentErrorSpan: document.getElementById('currentErrorSpan'),
            pTermSpan: document.getElementById('pTermSpan'),
            iTermSpan: document.getElementById('iTermSpan'),
            dTermSpan: document.getElementById('dTermSpan'),
            iaeMetric: document.getElementById('iae-metric'),
            overshootMetric: document.getElementById('overshoot-metric'),
            settlingTimeMetric: document.getElementById('settling-time-metric'),
            performanceMetric: document.getElementById('performance-metric'),

            // Status e Dicas
            disturbanceStatus: document.getElementById('disturbance-status'),
            controlQuality: document.getElementById('control-quality'),
            smartTip: document.getElementById('smart-tip'),
            statusSetpointValue: document.getElementById('status-setpoint-value'), // NOVO: ID adicionado no HTML

            // Cenários Educativos
            scenariosButton: document.getElementById('scenarios-button'),
            scenariosModal: document.getElementById('scenarios-modal'),
            closeScenariosModal: document.getElementById('close-scenarios-modal'),
            scenariosList: document.getElementById('scenarios-list'),
            scenarioPanel: document.getElementById('scenario-panel'),
            stopScenarioButton: document.getElementById('stop-scenario-button'),
        };

        this.config = {
            SIMULATION_TIMESTEP_S: 0.04,
            MAX_DATA_POINTS: 300,
            DISTURBANCE_FORCE: -30
        };

        // ✨ NOVO: Configurações específicas para cada planta
        this.plantConfigs = {
            mechanical: { setpoint: 80, min: 0, max: 120, disturbance: -30, units: '' },
            temperature: { setpoint: 60, min: 20, max: 120, disturbance: { type: 'door', value: true }, units: '°C' },
            level: { setpoint: 2.5, min: 0, max: 5, disturbance: { type: 'leak', value: 0.01 }, units: 'm' },
            motor: { setpoint: 1500, min: 0, max: 3000, disturbance: { type: 'load', value: 0.2 }, units: 'RPM' },
            pressure: { setpoint: 200, min: 100, max: 500, disturbance: { type: 'leak', value: 0.001 }, units: 'kPa' }
        };

        this.presets = {
            p_only: { kp: 1.0, ki: 0, kd: 0 },
            pi: { kp: 1.2, ki: 0.4, kd: 0 },
            pid_damped: { kp: 1.5, ki: 0.5, kd: 3.5 },
            pid_oscillatory: { kp: 8.0, ki: 2.0, kd: 1.0 },
            noisy_system: { kp: 0.8, ki: 0.3, kd: 2.0 },
            delayed_system: { kp: 2.0, ki: 0.6, kd: 4.0 }
        };

        this.plants = {
            mechanical: new MechanicalSystem({ inertia: 1.0, friction: 0.2, load: 20.0 }),
            temperature: new TemperatureControlSystem({ thermalCapacity: 500, thermalResistance: 0.1, ambientTemp: 25, maxHeatingPower: 2000 }),
            level: new TankLevelSystem({ tankArea: 2.0, maxOutletFlow: 0.05, maxLevel: 5.0 }),
            motor: new MotorSpeedSystem({ inertia: 0.01, friction: 0.1, torqueConstant: 0.5, maxCurrent: 10, gearRatio: 10 }),
            pressure: new PressureControlSystem({ volume: 0.1, temperature: 293, maxInletFlow: 0.01 })
        };

        this.currentPlantType = 'mechanical';
        this.plant = this.plants[this.currentPlantType];

        this.pid = new AdvancedPIDController(
            parseFloat(this.ui.kpSlider.value),
            parseFloat(this.ui.kiSlider.value),
            parseFloat(this.ui.kdSlider.value),
            { outputMin: -100, outputMax: 100 }
        );

        this.analyzer = new PerformanceAnalyzer();
        this.smartTips = new SmartTipsSystem();
        this.scenarios = new EducationalScenarios();

        this.setpoint = this.plantConfigs[this.currentPlantType].setpoint;
        this.isRunning = false;
        this.timeAccumulator = 0;
        this.lastFrameTime = null;
        this.activeScenario = null;
        this.isDisturbanceActive = false;

        this.initializeChart();
        this.setupControlListeners();
        this.setupScenariosSystem();
        this.switchPlant(this.currentPlantType); // Chamar para configurar o estado inicial
    }

    initializeChart() {
        const ctx = this.ui.pidChartCanvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Setpoint (SP)', data: [], borderColor: 'green', borderWidth: 2, pointRadius: 0 },
                    { label: 'Processo (PV)', data: [], borderColor: 'blue', borderWidth: 2, pointRadius: 0 },
                    { label: 'Saída (MV %)', data: [], borderColor: 'purple', borderWidth: 1.5, yAxisID: 'y1', pointRadius: 0 },
                    { label: 'Termo P', data: [], borderColor: 'rgba(245, 158, 11, 0.7)', borderWidth: 1, pointRadius: 0, yAxisID: 'y1', borderDash: [5, 5], hidden: true },
                    { label: 'Termo I', data: [], borderColor: 'rgba(16, 185, 129, 0.7)', borderWidth: 1, pointRadius: 0, yAxisID: 'y1', borderDash: [5, 5], hidden: true },
                    { label: 'Termo D (-)', data: [], borderColor: 'rgba(239, 68, 68, 0.7)', borderWidth: 1, pointRadius: 0, yAxisID: 'y1', borderDash: [5, 5], hidden: true },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: { title: { display: true, text: 'Tempo (s)' } },
                    y: { min: 0, max: 120, title: { display: true, text: 'Valor' } },
                    y1: { type: 'linear', position: 'right', min: -110, max: 110, title: { display: true, text: 'Saída (%)' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }

    setupControlListeners() {
        // Listener para Sliders PID
        const updateFromSliders = () => {
            const kp = parseFloat(this.ui.kpSlider.value);
            const ki = parseFloat(this.ui.kiSlider.value);
            const kd = parseFloat(this.ui.kdSlider.value);
            this.ui.kpValue.textContent = kp.toFixed(2);
            this.ui.kiValue.textContent = ki.toFixed(2);
            this.ui.kdValue.textContent = kd.toFixed(2);
            this.pid.setGains(kp, ki, kd);
        };
        ['input', 'change'].forEach(evt => {
            this.ui.kpSlider.addEventListener(evt, updateFromSliders);
            this.ui.kiSlider.addEventListener(evt, updateFromSliders);
            this.ui.kdSlider.addEventListener(evt, updateFromSliders);
        });

        // ✨ CORRIGIDO: Listener para Slider de Setpoint
        this.ui.setpointSlider.addEventListener('input', () => {
            this.setpoint = parseFloat(this.ui.setpointSlider.value);
            const units = this.plantConfigs[this.currentPlantType].units;
            this.ui.setpointValue.textContent = `${this.setpoint.toFixed(1)} ${units}`;
        });

        // Ações dos botões
        this.ui.resetButton.addEventListener('click', () => this.resetSimulation());
        this.ui.disturbanceButton.addEventListener('click', () => this.toggleDisturbance());
        this.ui.noiseButton.addEventListener('click', () => this.toggleNoise());
        this.ui.delayButton.addEventListener('click', () => this.toggleDelay());

        // Presets
        this.ui.presetButtons.forEach(button => {
            button.addEventListener('click', () => this.applyPreset(button.dataset.preset));
        });

        // Seletor de Planta
        this.ui.plantSelector.addEventListener('change', () => {
            this.switchPlant(this.ui.plantSelector.value);
        });

        // Sliders de Ruído e Atraso
        this.ui.noiseSlider.addEventListener('input', () => {
            this.ui.noiseValue.textContent = this.ui.noiseSlider.value;
            if (this.plant.sensorNoise) {
                this.plant.sensorNoise.amplitude = parseFloat(this.ui.noiseSlider.value);
            }
        });

        this.ui.delaySlider.addEventListener('input', () => {
            this.ui.delayValue.textContent = this.ui.delaySlider.value;
            if (this.plant.systemDelay) {
                this.plant.systemDelay.time = parseFloat(this.ui.delaySlider.value);
            }
        });
    }

    // ... (o resto das funções de cenário permanecem as mesmas)
    setupScenariosSystem() {
        if (this.ui.scenariosButton) {
            this.ui.scenariosButton.addEventListener('click', () => this.showScenariosModal());
        }
        if (this.ui.closeScenariosModal) {
            this.ui.closeScenariosModal.addEventListener('click', () => this.hideScenariosModal());
        }
        if (this.ui.scenariosModal) {
            this.ui.scenariosModal.addEventListener('click', (e) => {
                if (e.target === this.ui.scenariosModal) this.hideScenariosModal();
            });
        }
        if (this.ui.stopScenarioButton) {
            this.ui.stopScenarioButton.addEventListener('click', () => this.stopScenario());
        }
        this.populateScenariosList();
    }

    populateScenariosList() {
        if (!this.ui.scenariosList) return;
        const scenarios = this.scenarios.getAvailableScenarios();
        this.ui.scenariosList.innerHTML = '';
        scenarios.forEach(scenario => {
            const card = document.createElement('div');
            card.className = 'scenario-card';
            card.innerHTML = `
                <div class="scenario-card-content">
                    <h3>${scenario.name}</h3>
                    <p>${scenario.description}</p>
                    <div class="scenario-card-meta">
                        <span>Clique para iniciar</span>
                        <span class="scenario-steps">${scenario.steps} passos</span>
                    </div>
                </div>`;
            card.addEventListener('click', () => {
                this.startScenario(scenario.id);
                this.hideScenariosModal();
            });
            this.ui.scenariosList.appendChild(card);
        });
    }

    showScenariosModal() { if (this.ui.scenariosModal) this.ui.scenariosModal.style.display = 'flex'; }
    hideScenariosModal() { if (this.ui.scenariosModal) this.ui.scenariosModal.style.display = 'none'; }

    startScenario(scenarioId) {
        this.scenarios.startScenario(scenarioId, {
            onStepStart: (stepInfo) => this.onScenarioStepStart(stepInfo),
            onStepEnd: (stepInfo) => { },
            onScenarioComplete: (scenarioInfo) => this.onScenarioComplete(scenarioInfo)
        });
        this.activeScenario = scenarioId;
        this.showScenarioPanel();
    }

    onScenarioStepStart(stepInfo) {
        document.getElementById('scenario-title').textContent = stepInfo.title;
        document.getElementById('scenario-description').textContent = stepInfo.description;
        document.getElementById('scenario-explanation').textContent = stepInfo.explanation;
        document.getElementById('scenario-step').textContent = `Passo ${stepInfo.step} de ${stepInfo.totalSteps}`;
        const progress = (stepInfo.step / stepInfo.totalSteps) * 100;
        document.getElementById('scenario-percent').textContent = `${Math.round(progress)}%`;
        document.getElementById('scenario-progress-bar').style.width = `${progress}%`;

        const config = stepInfo.config;
        this.resetSimulation();

        this.ui.kpSlider.value = config.gains.kp;
        this.ui.kiSlider.value = config.gains.ki;
        this.ui.kdSlider.value = config.gains.kd;
        this.ui.kpSlider.dispatchEvent(new Event('input'));

        this.setpoint = config.setpoint;

        if (config.noise) {
            if (config.noise.enabled) this.toggleNoise(true, config.noise.amplitude);
        }
        if (config.derivativeFilter) this.pid.setDerivativeFilter(config.derivativeFilter);
        if (config.outputLimits) this.pid.setOutputLimits(config.outputLimits.min, config.outputLimits.max);
    }

    onScenarioComplete(scenarioInfo) {
        this.hideScenarioPanel();
        this.activeScenario = null;
        this.ui.smartTip.textContent = `✅ Cenário "${scenarioInfo.scenario}" concluído!`;
    }

    showScenarioPanel() { if (this.ui.scenarioPanel) this.ui.scenarioPanel.style.display = 'block'; }
    hideScenarioPanel() { if (this.ui.scenarioPanel) this.ui.scenarioPanel.style.display = 'none'; }

    stopScenario() {
        this.scenarios.stopScenario();
        this.hideScenarioPanel();
        this.activeScenario = null;
        this.ui.smartTip.textContent = "Cenário interrompido. Controle manual reativado.";
    }

    // ✨ MELHORADO: Lógica de troca de planta
    switchPlant(plantType) {
        if (!this.plants[plantType]) return;

        this.stop();
        this.currentPlantType = plantType;
        this.plant = this.plants[plantType];

        const config = this.plantConfigs[plantType];
        this.setpoint = config.setpoint;

        // Atualiza o slider de setpoint
        this.ui.setpointSlider.min = config.min;
        this.ui.setpointSlider.max = config.max;
        this.ui.setpointSlider.value = config.setpoint;
        this.ui.setpointSlider.dispatchEvent(new Event('input')); // Força a atualização do display

        // Atualiza os eixos do gráfico
        this.chart.options.scales.y.min = config.min;
        this.chart.options.scales.y.max = config.max;
        this.chart.options.scales.y.title.text = `Valor (${config.units})`;

        // Atualiza título do gráfico
        document.querySelector('.theater-title').textContent = `${this.ui.plantSelector.options[this.ui.plantSelector.selectedIndex].text}`;

        this.resetSimulation();
    }

    // ✨ CORRIGIDO: Lógica dos botões de toggle
    updateToggleButtonState(button, isEnabled) {
        const badge = button.querySelector('.status-badge');
        if (isEnabled) {
            button.classList.add('active');
            badge.textContent = 'On';
            badge.classList.replace('status-inactive', 'status-active');
        } else {
            button.classList.remove('active');
            badge.textContent = 'Off';
            badge.classList.replace('status-active', 'status-inactive');
        }
    }

    toggleNoise(forceState, amplitude) {
        const currentState = this.plant.sensorNoise ? this.plant.sensorNoise.enabled : false;
        const newState = forceState !== undefined ? forceState : !currentState;

        if (newState) {
            const noiseAmplitude = amplitude !== undefined ? amplitude : parseFloat(this.ui.noiseSlider.value);
            this.plant.enableNoise(noiseAmplitude);
        } else {
            this.plant.disableNoise();
        }
        this.updateToggleButtonState(this.ui.noiseButton, newState);
    }

    toggleDelay(forceState, delayTime) {
        const currentState = this.plant.systemDelay ? this.plant.systemDelay.enabled : false;
        const newState = forceState !== undefined ? forceState : !currentState;

        if (newState) {
            const systemDelay = delayTime !== undefined ? delayTime : parseFloat(this.ui.delaySlider.value);
            this.plant.enableDelay(systemDelay);
        } else {
            this.plant.disableDelay();
        }
        this.updateToggleButtonState(this.ui.delayButton, newState);
    }

    // ✨ CORRIGIDO: Agora o botão de perturbação também é um toggle ON/OFF
    toggleDisturbance() {
        this.isDisturbanceActive = !this.isDisturbanceActive;
        const disturbanceConfig = this.plantConfigs[this.currentPlantType].disturbance;

        if (this.isDisturbanceActive) {
            // Ativa a perturbação
            if (typeof disturbanceConfig === 'object') {
                this.plant.setDisturbance(disturbanceConfig.type, disturbanceConfig.value);
            } else {
                this.plant.setDisturbance(disturbanceConfig);
            }
        } else {
            // Desativa a perturbação
            if (typeof disturbanceConfig === 'object') {
                this.plant.setDisturbance(disturbanceConfig.type, 0); // Usa 0 ou false para desativar
            } else {
                this.plant.setDisturbance(0);
            }
        }

        // Atualiza o estado visual do botão
        const button = this.ui.disturbanceButton;
        const badge = button.querySelector('.status-badge');
        button.classList.toggle('active', this.isDisturbanceActive);

        if (this.isDisturbanceActive) {
            badge.textContent = 'Ativa';
            badge.classList.replace('status-inactive', 'status-active');
        } else {
            badge.textContent = 'Inativa';
            badge.classList.replace('status-active', 'status-inactive');
        }
    }

    resetSimulation() {
        this.stop();
        this.plant.reset();
        this.pid.reset();
        this.analyzer.reset();

        // Desativa perturbação
        if (this.isDisturbanceActive) {
            this.toggleDisturbance();
        }
        // Desativa ruído e atraso
        if (this.plant.sensorNoise && this.plant.sensorNoise.enabled) {
            this.toggleNoise(false);
        }
        if (this.plant.systemDelay && this.plant.systemDelay.enabled) {
            this.toggleDelay(false);
        }

        this.chart.data.labels = [];
        this.chart.data.datasets.forEach(d => d.data = []);
        this.chart.update();

        this.start();
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.resetSimulation();

        this.ui.kpSlider.value = preset.kp;
        this.ui.kiSlider.value = preset.ki;
        this.ui.kdSlider.value = preset.kd;
        this.ui.kpSlider.dispatchEvent(new Event('input')); // Força atualização de valores e PID

        if (presetName === 'noisy_system') {
            this.toggleNoise(true, 0.8);
        }
        if (presetName === 'delayed_system') {
            this.toggleDelay(true, 0.15);
        }
    }

    simulationLoop = (currentTime) => {
        if (!this.isRunning) return;

        if (!this.lastFrameTime) this.lastFrameTime = currentTime;
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        this.timeAccumulator += deltaTime;

        while (this.timeAccumulator >= this.config.SIMULATION_TIMESTEP_S) {
            if (this.activeScenario) {
                const scenarioConfig = this.scenarios.update(this.chart.data.labels.length * this.config.SIMULATION_TIMESTEP_S);
                if (scenarioConfig && scenarioConfig.setpoint !== undefined) {
                    this.setpoint = scenarioConfig.setpoint;
                }
            }

            const plantState = this.plant.update(0, this.config.SIMULATION_TIMESTEP_S); // Update dummy
            const pv = plantState.processVariable ?? plantState.measuredPosition ?? plantState.position;
            const mv = this.pid.update(this.setpoint, pv, this.config.SIMULATION_TIMESTEP_S);
            this.plant.update(mv, this.config.SIMULATION_TIMESTEP_S);

            this.updateUI(pv, mv);
            this.timeAccumulator -= this.config.SIMULATION_TIMESTEP_S;
        }

        requestAnimationFrame(this.simulationLoop);
    }

    // ✨ MELHORADO: Centraliza todas as atualizações de UI
    updateUI(pv, mv) {
        const error = this.setpoint - pv;
        const currentTime = this.chart.data.labels.length * this.config.SIMULATION_TIMESTEP_S;

        // Análise
        this.analyzer.update(currentTime, this.setpoint, pv, mv);
        const report = this.analyzer.generateReport();
        const terms = this.pid.getTerms();

        // Métricas
        this.ui.currentErrorSpan.textContent = error.toFixed(2);
        this.ui.pTermSpan.textContent = terms.proportional.toFixed(2);
        this.ui.iTermSpan.textContent = terms.integral.toFixed(2);
        this.ui.dTermSpan.textContent = terms.derivative.toFixed(2);
        this.ui.iaeMetric.textContent = report.errorMetrics.iae.toFixed(2);
        this.ui.overshootMetric.textContent = report.responseMetrics.overshoot.toFixed(1) + '%';
        this.ui.settlingTimeMetric.textContent = report.responseMetrics.settlingTime ? `${report.responseMetrics.settlingTime.toFixed(1)}s` : '--';
        this.ui.performanceMetric.textContent = report.summary.performanceIndex.toFixed(0);

        // Status e Dicas
        if (!this.activeScenario) {
            this.ui.controlQuality.textContent = report.summary.quality;
            this.ui.smartTip.textContent = report.summary.recommendation[0] || this.smartTips.getTip(report.summary, terms);
        }

        // ✨ CORRIGIDO: Atualização dinâmica do painel de status
        this.ui.disturbanceStatus.textContent = this.isDisturbanceActive ? 'Ativa' : 'Inativa';
        const units = this.plantConfigs[this.currentPlantType].units;
        // Para atualizar o painel, você precisará adicionar um ID ao span do setpoint no HTML
        // Ex: <span id="status-setpoint-value" ...>
        if (this.ui.statusSetpointValue) {
            this.ui.statusSetpointValue.textContent = `${this.setpoint.toFixed(1)} ${units}`;
        }


        // Gráfico
        const data = this.chart.data;
        data.labels.push(currentTime.toFixed(1));
        data.datasets[0].data.push(this.setpoint);
        data.datasets[1].data.push(pv);
        data.datasets[2].data.push(mv);
        data.datasets[3].data.push(terms.proportional);
        data.datasets[4].data.push(terms.integral);
        data.datasets[5].data.push(terms.derivative);

        if (data.labels.length > this.config.MAX_DATA_POINTS) {
            data.labels.shift();
            data.datasets.forEach(d => d.data.shift());
        }

        this.chart.update();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastFrameTime = null;
        requestAnimationFrame(this.simulationLoop);
    }

    stop() {
        this.isRunning = false;
    }
}

// ✨ Adicionar um ID ao span do setpoint no painel de status no index.html
// Encontre esta linha:
// <span style="color: var(--accent-success); font-weight: 600;">80.0</span>
// E mude para:
// <span id="status-setpoint-value" style="color: var(--accent-success); font-weight: 600;">80.0</span>

window.addEventListener('DOMContentLoaded', () => { new SimulationApp(); });