import { AdvancedPIDController } from './advanced-pid.js';
import { MechanicalSystem } from './plant-models.js';
import { TemperatureControlSystem, TankLevelSystem, MotorSpeedSystem, PressureControlSystem } from './industrial-plants.js';
import { PerformanceAnalyzer } from './performance-analyzer.js';
import { SmartTipsSystem } from './smart-tips.js';
import { EducationalScenarios } from './educational-scenarios.js';

class SimulationApp {
    constructor() {
        this.ui = {
            // Controles existentes
            kpSlider: document.getElementById('kp-slider'),
            kiSlider: document.getElementById('ki-slider'),
            kdSlider: document.getElementById('kd-slider'),
            kpValue: document.getElementById('kp-value'),
            kiValue: document.getElementById('ki-value'),
            kdValue: document.getElementById('kd-value'),
            resetButton: document.getElementById('reset-button'),
            disturbanceButton: document.getElementById('disturbance-button'),
            presetButtons: document.querySelectorAll('.preset-card'),
            pidChartCanvas: document.getElementById('pidChart'),
            currentErrorSpan: document.getElementById('currentErrorSpan'),
            pTermSpan: document.getElementById('pTermSpan'),
            iTermSpan: document.getElementById('iTermSpan'),
            dTermSpan: document.getElementById('dTermSpan'),
            
            // Controles de ruído e atraso
            noiseButton: document.getElementById('noise-button'),
            delayButton: document.getElementById('delay-button'),
            noiseSlider: document.getElementById('noise-slider'),
            delaySlider: document.getElementById('delay-slider'),
            noiseValue: document.getElementById('noise-value'),
            delayValue: document.getElementById('delay-value'),
            
            // ✨ NOVOS: Controles avançados
            plantSelector: document.getElementById('plant-selector'),
            scenariosButton: document.getElementById('scenarios-button'),
            scenariosModal: document.getElementById('scenarios-modal'),
            closeScenariosModal: document.getElementById('close-scenarios-modal'),
            scenariosList: document.getElementById('scenarios-list'),
            scenarioPanel: document.getElementById('scenario-panel'),
            stopScenarioButton: document.getElementById('stop-scenario-button'),
            
            // Métricas avançadas
            settlingTimeMetric: document.getElementById('settling-time-metric'),
            performanceMetric: document.getElementById('performance-metric')
        };

        this.config = {
            SIMULATION_TIMESTEP_S: 0.04,
            MAX_DATA_POINTS: 300,
            DISTURBANCE_FORCE: -30
        };

        this.isAutoTuning = false;
        this.autoTune = {
            initialKp: 0.5,
            kpStep: 0.2,
            lastPeak: { value: -Infinity, time: 0 },
            lastTrough: { value: Infinity, time: 0 },
            peaks: [],
            oscillationPeriod: 0,
            ultimateGain: 0
        };

        this.presets = {
            p_only: { kp: 1.0, ki: 0, kd: 0 },
            pi: { kp: 1.2, ki: 0.4, kd: 0 },
            pid_damped: { kp: 1.5, ki: 0.5, kd: 3.5 },
            pid_oscillatory: { kp: 8.0, ki: 2.0, kd: 1.0 },
            noisy_system: { kp: 0.8, ki: 0.3, kd: 2.0 },
            delayed_system: { kp: 2.0, ki: 0.6, kd: 4.0 }
        };

        // ✨ NOVO: Sistema de plantas industriais
        this.plants = {
            mechanical: new MechanicalSystem({
                inertia: 1.0,
                friction: 0.2,
                load: 20.0,
                noiseEnabled: false,
                noiseAmplitude: 0.5,
                delayEnabled: false,
                delayTime: 0.1
            }),
            temperature: new TemperatureControlSystem({
                thermalCapacity: 500,
                thermalResistance: 0.1,
                ambientTemp: 25,
                maxHeatingPower: 2000
            }),
            level: new TankLevelSystem({
                tankArea: 2.0,
                maxOutletFlow: 0.05,
                maxLevel: 5.0
            }),
            motor: new MotorSpeedSystem({
                inertia: 0.01,
                friction: 0.1,
                torqueConstant: 0.5,
                maxCurrent: 10,
                gearRatio: 10
            }),
            pressure: new PressureControlSystem({
                volume: 0.1,
                temperature: 293,
                maxInletFlow: 0.01
            })
        };
        
        this.currentPlantType = 'mechanical';
        this.plant = this.plants[this.currentPlantType];

        // ✨ NOVO: Controlador PID avançado
        this.pid = new AdvancedPIDController(
            this.ui.kpSlider.value,
            this.ui.kiSlider.value,
            this.ui.kdSlider.value,
            { outputMin: -100, outputMax: 100 }
        );

        // ✨ NOVO: Analisador de performance avançado
        this.analyzer = new PerformanceAnalyzer();
        this.smartTips = new SmartTipsSystem();
        
        // ✨ NOVO: Sistema de cenários educativos
        this.scenarios = new EducationalScenarios();

        this.setpoint = this.getDefaultSetpoint();
        this.isRunning = false;
        this.timeAccumulator = 0;
        this.lastFrameTime = null;
        
        // ✨ NOVO: Estado do cenário ativo
        this.activeScenario = null;

        this.initializeChart();
        this.setupControlListeners();
        this.setupScenariosSystem();
        this.resetSimulation();
    }
    
    // ✨ NOVO: Obtém setpoint padrão baseado na planta
    getDefaultSetpoint() {
        const defaults = {
            mechanical: 80,
            temperature: 60,  // °C
            level: 2.5,       // m
            motor: 1500,      // RPM
            pressure: 200     // kPa
        };
        return defaults[this.currentPlantType] || 80;
    }
    
    // ✨ NOVO: Obtém unidades baseadas na planta
    getUnits() {
        const units = {
            mechanical: '',
            temperature: '°C',
            level: 'm',
            motor: 'RPM',
            pressure: 'kPa'
        };
        return units[this.currentPlantType] || '';
    }

    startAutoTune() {
        if (this.isAutoTuning) return;
        console.log("Iniciando Auto-Tuning...");
        this.isAutoTuning = true;

        // Resetar o estado da sintonia
        this.autoTune.peaks = [];
        this.autoTune.lastPeak = { value: -Infinity, time: 0 };
        this.autoTune.lastTrough = { value: Infinity, time: 0 };

        this.resetSimulation(); // Reseta planta e controlador

        // Configurar para o método da oscilação
        this.pid.setGains(this.autoTune.initialKp, 0, 0); // Zera Ki e Kd, começa com Kp baixo
        this.ui.kpSlider.value = this.autoTune.initialKp;
        this.ui.kiSlider.value = 0;
        this.ui.kdSlider.value = 0;
        this.ui.kpValue.textContent = this.autoTune.initialKp.toFixed(2);
        this.ui.kiValue.textContent = "0.00";
        this.ui.kdValue.textContent = "0.00";

        document.getElementById('smart-tip').textContent = "🔎 Buscando oscilação estável...";
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
                    y: { min: -10, max: 120, title: { display: true, text: 'Valor' } },
                    y1: { type: 'linear', position: 'right', min: -110, max: 110, title: { display: true, text: 'Saída (%)' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }

    setupControlListeners() {
        // Controles originais
        const updateFromSliders = () => {
            this.ui.kpValue.textContent = this.ui.kpSlider.value;
            this.ui.kiValue.textContent = this.ui.kiSlider.value;
            this.ui.kdValue.textContent = this.ui.kdSlider.value;
            this.pid.setGains(this.ui.kpSlider.value, this.ui.kiSlider.value, this.ui.kdSlider.value);
        };

        const autoTuneButton = document.getElementById('auto-tune-button');
        if (autoTuneButton) {
            autoTuneButton.addEventListener('click', () => this.startAutoTune());
        }

        this.ui.kpSlider.addEventListener('input', updateFromSliders);
        this.ui.kiSlider.addEventListener('input', updateFromSliders);
        this.ui.kdSlider.addEventListener('input', updateFromSliders);
        this.ui.resetButton.addEventListener('click', () => this.resetSimulation());
        this.ui.disturbanceButton.addEventListener('click', () => this.toggleDisturbance());

        this.ui.presetButtons.forEach(button => {
            button.addEventListener('click', () => this.applyPreset(button.dataset.preset));
        });

        // Listeners para ruído e atraso
        if (this.ui.noiseButton) {
            this.ui.noiseButton.addEventListener('click', () => this.toggleNoise());
        }

        if (this.ui.delayButton) {
            this.ui.delayButton.addEventListener('click', () => this.toggleDelay());
        }

        if (this.ui.noiseSlider) {
            this.ui.noiseSlider.addEventListener('input', () => {
                this.ui.noiseValue.textContent = this.ui.noiseSlider.value;
                if (this.plant.sensorNoise) {
                    this.plant.sensorNoise.amplitude = parseFloat(this.ui.noiseSlider.value);
                }
            });
        }

        if (this.ui.delaySlider) {
            this.ui.delaySlider.addEventListener('input', () => {
                this.ui.delayValue.textContent = this.ui.delaySlider.value;
                if (this.plant.systemDelay) {
                    this.plant.systemDelay.time = parseFloat(this.ui.delaySlider.value);
                }
            });
        }
        
        // ✨ NOVO: Listener para seletor de planta
        if (this.ui.plantSelector) {
            this.ui.plantSelector.addEventListener('change', () => {
                this.switchPlant(this.ui.plantSelector.value);
            });
        }
    }
    
    // ✨ NOVO: Configuração do sistema de cenários
    setupScenariosSystem() {
        // Botão para abrir modal de cenários
        if (this.ui.scenariosButton) {
            this.ui.scenariosButton.addEventListener('click', () => {
                this.showScenariosModal();
            });
        }
        
        // Fechar modal
        if (this.ui.closeScenariosModal) {
            this.ui.closeScenariosModal.addEventListener('click', () => {
                this.hideScenariosModal();
            });
        }
        
        // Fechar modal clicando fora
        if (this.ui.scenariosModal) {
            this.ui.scenariosModal.addEventListener('click', (e) => {
                if (e.target === this.ui.scenariosModal) {
                    this.hideScenariosModal();
                }
            });
        }
        
        // Parar cenário
        if (this.ui.stopScenarioButton) {
            this.ui.stopScenarioButton.addEventListener('click', () => {
                this.stopScenario();
            });
        }
        
        // Preenche lista de cenários
        this.populateScenariosList();
    }
    
    // ✨ NOVO: Preenche a lista de cenários disponíveis
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
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.startScenario(scenario.id);
                this.hideScenariosModal();
            });
            
            this.ui.scenariosList.appendChild(card);
        });
    }
    
    // ✨ NOVO: Mostra modal de cenários
    showScenariosModal() {
        if (this.ui.scenariosModal) {
            this.ui.scenariosModal.style.display = 'flex';
        }
    }
    
    // ✨ NOVO: Esconde modal de cenários
    hideScenariosModal() {
        if (this.ui.scenariosModal) {
            this.ui.scenariosModal.style.display = 'none';
        }
    }
    
    // ✨ NOVO: Inicia um cenário educativo
    startScenario(scenarioId) {
        this.scenarios.startScenario(scenarioId, {
            onStepStart: (stepInfo) => {
                this.onScenarioStepStart(stepInfo);
            },
            onStepEnd: (stepInfo) => {
                this.onScenarioStepEnd(stepInfo);
            },
            onScenarioComplete: (scenarioInfo) => {
                this.onScenarioComplete(scenarioInfo);
            }
        });
        
        this.activeScenario = scenarioId;
        this.showScenarioPanel();
    }
    
    // ✨ NOVO: Callback para início de passo do cenário
    onScenarioStepStart(stepInfo) {
        // Atualiza interface do painel
        document.getElementById('scenario-title').textContent = stepInfo.title;
        document.getElementById('scenario-description').textContent = stepInfo.description;
        document.getElementById('scenario-explanation').textContent = stepInfo.explanation;
        document.getElementById('scenario-step').textContent = `Passo ${stepInfo.step} de ${stepInfo.totalSteps}`;
        document.getElementById('scenario-percent').textContent = `${Math.round((stepInfo.step / stepInfo.totalSteps) * 100)}%`;
        document.getElementById('scenario-progress-bar').style.width = `${(stepInfo.step / stepInfo.totalSteps) * 100}%`;
        
        // Aplica configurações do passo
        const config = stepInfo.config;
        
        // Reset sistema
        this.resetSimulation();
        
        // Aplica ganhos
        this.ui.kpSlider.value = config.gains.kp;
        this.ui.kiSlider.value = config.gains.ki;
        this.ui.kdSlider.value = config.gains.kd;
        this.ui.kpSlider.dispatchEvent(new Event('input'));
        this.ui.kiSlider.dispatchEvent(new Event('input'));
        this.ui.kdSlider.dispatchEvent(new Event('input'));
        
        // Aplica setpoint
        this.setpoint = config.setpoint;
        
        // Configurações especiais
        if (config.noise) {
            if (config.noise.enabled && this.plant.enableNoise) {
                this.plant.enableNoise(config.noise.amplitude);
                if (this.ui.noiseButton) this.ui.noiseButton.classList.add('active');
            }
        }
        
        if (config.derivativeFilter && this.pid.setDerivativeFilter) {
            this.pid.setDerivativeFilter(config.derivativeFilter);
        }
        
        if (config.outputLimits && this.pid.setOutputLimits) {
            this.pid.setOutputLimits(config.outputLimits.min, config.outputLimits.max);
        }
    }
    
    // ✨ NOVO: Callback para fim de passo do cenário
    onScenarioStepEnd(stepInfo) {
        // Pode adicionar lógica específica aqui
    }
    
    // ✨ NOVO: Callback para conclusão do cenário
    onScenarioComplete(scenarioInfo) {
        this.hideScenarioPanel();
        this.activeScenario = null;
        
        // Mostra mensagem de conclusão
        document.getElementById('smart-tip').textContent = 
            `✅ Cenário "${scenarioInfo.scenario}" concluído! Você completou ${scenarioInfo.totalSteps} passos educativos.`;
    }
    
    // ✨ NOVO: Mostra painel de cenário ativo
    showScenarioPanel() {
        if (this.ui.scenarioPanel) {
            this.ui.scenarioPanel.style.display = 'block';
        }
    }
    
    // ✨ NOVO: Esconde painel de cenário ativo
    hideScenarioPanel() {
        if (this.ui.scenarioPanel) {
            this.ui.scenarioPanel.style.display = 'none';
        }
    }
    
    // ✨ NOVO: Para cenário ativo
    stopScenario() {
        this.scenarios.stopScenario();
        this.hideScenarioPanel();
        this.activeScenario = null;
        
        document.getElementById('smart-tip').textContent = 
            "Cenário interrompido. Você pode continuar ajustando os parâmetros manualmente.";
    }
    
    // ✨ NOVO: Troca de planta industrial
    switchPlant(plantType) {
        if (!this.plants[plantType]) return;
        
        this.currentPlantType = plantType;
        this.plant = this.plants[plantType];
        this.setpoint = this.getDefaultSetpoint();
        
        // Atualiza título do gráfico
        const titles = {
            mechanical: 'Sistema Mecânico',
            temperature: 'Controle de Temperatura',
            level: 'Controle de Nível',
            motor: 'Controle de Velocidade',
            pressure: 'Controle de Pressão'
        };
        
        document.querySelector('.theater-title').textContent = titles[plantType] || 'Sistema de Controle';
        
        this.resetSimulation();
    }

    toggleNoise() {
        if (this.plant.sensorNoise && this.plant.sensorNoise.enabled) {
            this.plant.disableNoise();
            this.ui.noiseButton.classList.remove('active');
        } else {
            this.plant.enableNoise(parseFloat(this.ui.noiseSlider?.value || 0.5));
            this.ui.noiseButton.classList.add('active');
        }
    }

    toggleDelay() {
        if (this.plant.systemDelay && this.plant.systemDelay.enabled) {
            this.plant.disableDelay();
            this.ui.delayButton.classList.remove('active');
        } else {
            this.plant.enableDelay(parseFloat(this.ui.delaySlider?.value || 0.1));
            this.ui.delayButton.classList.add('active');
        }
    }

    resetSimulation() {
        this.stop();
        this.plant.reset();
        this.pid.reset();
        this.ui.disturbanceButton.classList.remove('active');

        if (this.ui.noiseButton) this.ui.noiseButton.classList.remove('active');
        if (this.ui.delayButton) this.ui.delayButton.classList.remove('active');

        this.chart.data.labels = [];
        this.chart.data.datasets.forEach(d => d.data = []);
        this.start();
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.ui.kpSlider.value = preset.kp;
        this.ui.kiSlider.value = preset.ki;
        this.ui.kdSlider.value = preset.kd;
        this.ui.kpSlider.dispatchEvent(new Event('input'));
        this.ui.kiSlider.dispatchEvent(new Event('input'));
        this.ui.kdSlider.dispatchEvent(new Event('input'));

        if (presetName === 'noisy_system') {
            this.plant.enableNoise(0.8);
            if (this.ui.noiseButton) this.ui.noiseButton.classList.add('active');
        }
        if (presetName === 'delayed_system') {
            this.plant.enableDelay(0.15);
            if (this.ui.delayButton) this.ui.delayButton.classList.add('active');
        }

        this.resetSimulation();
    }

    toggleDisturbance() {
        const isActive = this.plant._disturbance !== 0;
        const disturbanceValue = isActive ? 0 : this.config.DISTURBANCE_FORCE;
        
        if (this.plant.setDisturbance) {
            this.plant.setDisturbance(disturbanceValue);
        }
        this.ui.disturbanceButton.classList.toggle('active', !isActive);
    }

    simulationLoop = (currentTime) => {
        if (!this.lastFrameTime) this.lastFrameTime = currentTime;
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        this.timeAccumulator += deltaTime;

        while (this.timeAccumulator >= this.config.SIMULATION_TIMESTEP_S) {
            // ✨ NOVO: Atualiza cenário ativo
            if (this.activeScenario) {
                const scenarioConfig = this.scenarios.update(this.chart.data.labels.length * this.config.SIMULATION_TIMESTEP_S);
                if (scenarioConfig && scenarioConfig.setpoint !== undefined) {
                    this.setpoint = scenarioConfig.setpoint;
                }
            }
            
            const plantState = this.plant.update(0, this.config.SIMULATION_TIMESTEP_S); // Primeiro update para inicializar

            // Usa processVariable se disponível, senão measuredPosition, senão position
            const pv = plantState.processVariable !== undefined ? 
                plantState.processVariable : 
                (plantState.measuredPosition !== undefined ? 
                    plantState.measuredPosition : plantState.position);
                    
            if (this.isAutoTuning) {
                this.runAutoTuneLogic(pv, this.chart.data.labels.length * this.config.SIMULATION_TIMESTEP_S);
            }

            const mv = this.pid.update(this.setpoint, pv, this.config.SIMULATION_TIMESTEP_S);
            this.plant.update(mv, this.config.SIMULATION_TIMESTEP_S);

            this.updateUI(pv, mv);
            this.timeAccumulator -= this.config.SIMULATION_TIMESTEP_S;
        }

        if (this.isRunning) requestAnimationFrame(this.simulationLoop);
    }

    updateUI(pv, mv) {
        const error = this.setpoint - pv;
        const currentTime = this.chart.data.labels.length * this.config.SIMULATION_TIMESTEP_S;

        // ✨ NOVO: Análise avançada em tempo real
        this.analyzer.update(currentTime, this.setpoint, pv, mv);
        const report = this.analyzer.generateReport();

        // Atualiza métricas básicas
        this.ui.currentErrorSpan.textContent = error.toFixed(2);
        
        const terms = this.pid.getTerms();
        this.ui.pTermSpan.textContent = terms.proportional.toFixed(2);
        this.ui.iTermSpan.textContent = terms.integral.toFixed(2);
        this.ui.dTermSpan.textContent = terms.derivative.toFixed(2);
        
        // ✨ NOVO: Atualiza métricas avançadas
        document.getElementById('iae-metric').textContent = report.errorMetrics.iae.toFixed(2);
        document.getElementById('overshoot-metric').textContent = report.responseMetrics.overshoot.toFixed(1) + '%';
        this.ui.settlingTimeMetric.textContent = report.responseMetrics.settlingTime ? 
            report.responseMetrics.settlingTime.toFixed(1) + 's' : '--';
        this.ui.performanceMetric.textContent = report.summary.performanceIndex.toFixed(0);

        // Atualiza qualidade e dicas (se não há cenário ativo)
        if (!this.activeScenario) {
            document.getElementById('control-quality').textContent = report.summary.quality;
            document.getElementById('smart-tip').textContent = 
                report.summary.recommendation.length > 0 ? 
                report.summary.recommendation[0] : 
                this.smartTips.getTip(report.summary, terms);
        }

        // Atualiza gráfico
        const data = this.chart.data;
        const time = (data.labels.length * this.config.SIMULATION_TIMESTEP_S).toFixed(1);
        data.labels.push(time);
        data.datasets[0].data.push(this.setpoint);
        data.datasets[1].data.push(pv);
        data.datasets[2].data.push(mv);
        
        // Termos PID para análise detalhada
        data.datasets[3].data.push(terms.proportional);
        data.datasets[4].data.push(terms.integral);
        data.datasets[5].data.push(terms.derivative);

        if (data.labels.length > this.config.MAX_DATA_POINTS) {
            data.labels.shift();
            data.datasets.forEach(d => d.data.shift());
        }
        
        this.chart.update();
    }

    runAutoTuneLogic(pv, currentTime) {
        const history = this.chart.data.datasets[1].data;
        if (history.length < 3) return;

        const prevPv = history[history.length - 2];

        // Detecta um pico
        if (pv < prevPv && prevPv > history[history.length - 3]) {
            if (prevPv > this.autoTune.lastPeak.value) {
                this.autoTune.lastPeak = { value: prevPv, time: currentTime };
                this.autoTune.peaks.push(this.autoTune.lastPeak);

                // Checa se as oscilações são estáveis
                if (this.autoTune.peaks.length > 4) {
                    this.autoTune.peaks.shift(); // Mantém apenas os 4 últimos picos
                    const firstPeak = this.autoTune.peaks[0];
                    const lastPeak = this.autoTune.peaks[3];

                    // Critério de estabilidade: variação de amplitude pequena
                    if (Math.abs(lastPeak.value - firstPeak.value) < (this.setpoint * 0.05)) {
                        const config = this.pid.getConfiguration();
                        this.autoTune.ultimateGain = config.gains.Kp;
                        // Período é a média do tempo entre os picos
                        this.autoTune.oscillationPeriod = (lastPeak.time - firstPeak.time) / (this.autoTune.peaks.length - 1);
                        this.finishAutoTune();
                        return;
                    }
                }
            }
        }

        // Se não encontrou oscilação estável, aumenta Kp lentamente
        // Aumenta Kp a cada 5 segundos de simulação, por exemplo
        if (Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime) > 0 && !this.kpIncreasedThisSecond) {
            const config = this.pid.getConfiguration();
            const newKp = config.gains.Kp + this.autoTune.kpStep;
            this.pid.setGains(newKp, 0, 0);
            this.ui.kpSlider.value = newKp;
            this.ui.kpValue.textContent = newKp.toFixed(2);
            this.kpIncreasedThisSecond = true; // Flag para não aumentar várias vezes no mesmo segundo
        } else if (Math.floor(currentTime) % 5 !== 0) {
            this.kpIncreasedThisSecond = false;
        }
    }

    finishAutoTune() {
        console.log(`Auto-Tuning Concluído! Ku=${this.autoTune.ultimateGain}, Tu=${this.autoTune.oscillationPeriod}`);
        this.isAutoTuning = false;

        const Ku = this.autoTune.ultimateGain;
        const Tu = this.autoTune.oscillationPeriod;

        if (Ku <= 0 || Tu <= 0) {
            document.getElementById('smart-tip').textContent = "⚠️ Auto-Tuning falhou. Tente novamente.";
            return;
        }

        // Fórmulas de Ziegler-Nichols para PID
        const Kp = 0.6 * Ku;
        const Ki = (1.2 * Ku) / Tu; // Equivalente a Kp / (Tu / 2)
        const Kd = (0.6 * Ku * Tu) / 8; // Equivalente a Kp * (Tu / 8)

        // Aplica os novos ganhos
        this.pid.setGains(Kp, Ki, Kd);
        this.ui.kpSlider.value = Kp;
        this.ui.kiSlider.value = Ki;
        this.ui.kdSlider.value = Kd;
        this.ui.kpSlider.dispatchEvent(new Event('input'));
        this.ui.kiSlider.dispatchEvent(new Event('input'));
        this.ui.kdSlider.dispatchEvent(new Event('input'));

        document.getElementById('smart-tip').textContent = `✅ Auto-Tuning aplicado! Kp=${Kp.toFixed(2)}, Ki=${Ki.toFixed(2)}, Kd=${Kd.toFixed(2)}`;

        // Reseta a simulação para ver o novo comportamento
        setTimeout(() => this.resetSimulation(), 500);
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

window.addEventListener('DOMContentLoaded', () => { new SimulationApp(); });