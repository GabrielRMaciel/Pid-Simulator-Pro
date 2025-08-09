/**
 * Sistema de cenários educativos estruturados
 * Baseado no PRD - Seção 3.5
 */

export class EducationalScenarios {
    constructor() {
        this.scenarios = {
            // Demonstração individual dos efeitos dos ganhos
            gain_effects: {
                name: "Efeitos dos Ganhos PID",
                description: "Demonstra o efeito individual de cada ganho",
                steps: [
                    {
                        title: "Sistema sem controle",
                        description: "Observe o sistema sem nenhum controle ativo",
                        gains: { kp: 0, ki: 0, kd: 0 },
                        setpoint: 50,
                        duration: 10,
                        explanation: "Sem controle, o sistema não consegue atingir o setpoint"
                    },
                    {
                        title: "Apenas controle Proporcional",
                        description: "Adiciona apenas o ganho proporcional",
                        gains: { kp: 2.0, ki: 0, kd: 0 },
                        setpoint: 50,
                        duration: 15,
                        explanation: "O controle P reduz o erro, mas deixa erro residual (offset)"
                    },
                    {
                        title: "Controle PI",
                        description: "Adiciona o ganho integral",
                        gains: { kp: 2.0, ki: 0.5, kd: 0 },
                        setpoint: 50,
                        duration: 20,
                        explanation: "O termo I elimina o erro residual, mas pode causar oscilação"
                    },
                    {
                        title: "Controle PID completo",
                        description: "Adiciona o ganho derivativo",
                        gains: { kp: 2.0, ki: 0.5, kd: 1.5 },
                        setpoint: 50,
                        duration: 15,
                        explanation: "O termo D melhora a estabilidade e reduz overshoot"
                    }
                ]
            },
            
            // Métodos de sintonia
            tuning_methods: {
                name: "Métodos de Sintonia",
                description: "Compara diferentes métodos de sintonia automática",
                steps: [
                    {
                        title: "Sistema mal sintonizado",
                        description: "Ganhos inadequados causam instabilidade",
                        gains: { kp: 10, ki: 5, kd: 0.1 },
                        setpoint: 60,
                        duration: 15,
                        explanation: "Ganhos muito altos causam oscilação excessiva"
                    },
                    {
                        title: "Ziegler-Nichols",
                        description: "Aplicação do método clássico",
                        gains: { kp: 1.8, ki: 0.6, kd: 2.7 },
                        setpoint: 60,
                        duration: 20,
                        explanation: "Z-N oferece resposta rápida, mas pode ter overshoot"
                    },
                    {
                        title: "Cohen-Coon",
                        description: "Método para sistemas com atraso",
                        gains: { kp: 1.2, ki: 0.4, kd: 1.8 },
                        setpoint: 60,
                        duration: 20,
                        explanation: "C-C é mais conservativo, melhor para sistemas com atraso"
                    },
                    {
                        title: "Lambda Tuning",
                        description: "Sintonia baseada no tempo de resposta desejado",
                        gains: { kp: 0.8, ki: 0.2, kd: 0 },
                        setpoint: 60,
                        duration: 20,
                        explanation: "Lambda oferece resposta suave e robusta"
                    }
                ]
            },
            
            // Rejeição de perturbações
            disturbance_rejection: {
                name: "Rejeição de Perturbações",
                description: "Como diferentes sintônias lidam com perturbações",
                steps: [
                    {
                        title: "Sintonia conservadora",
                        description: "Ganhos baixos, resposta lenta",
                        gains: { kp: 0.5, ki: 0.1, kd: 0.5 },
                        setpoint: 70,
                        duration: 10,
                        disturbance: { time: 5, value: -20, duration: 2 },
                        explanation: "Resposta lenta à perturbação, mas estável"
                    },
                    {
                        title: "Sintonia agressiva",
                        description: "Ganhos altos, resposta rápida",
                        gains: { kp: 3.0, ki: 1.0, kd: 2.0 },
                        setpoint: 70,
                        duration: 10,
                        disturbance: { time: 5, value: -20, duration: 2 },
                        explanation: "Resposta rápida, mas pode oscilar"
                    },
                    {
                        title: "Sintonia balanceada",
                        description: "Compromisso entre velocidade e estabilidade",
                        gains: { kp: 1.5, ki: 0.5, kd: 1.2 },
                        setpoint: 70,
                        duration: 10,
                        disturbance: { time: 5, value: -20, duration: 2 },
                        explanation: "Boa rejeição de perturbação com estabilidade"
                    }
                ]
            },
            
            // Rastreamento de setpoint
            setpoint_tracking: {
                name: "Rastreamento de Setpoint",
                description: "Resposta a mudanças de referência",
                steps: [
                    {
                        title: "Mudanças graduais",
                        description: "Setpoint muda lentamente",
                        gains: { kp: 1.5, ki: 0.4, kd: 1.0 },
                        setpointProfile: [
                            { time: 0, value: 30 },
                            { time: 10, value: 50 },
                            { time: 20, value: 70 },
                            { time: 30, value: 40 }
                        ],
                        duration: 35,
                        explanation: "Mudanças graduais são mais fáceis de rastrear"
                    },
                    {
                        title: "Mudanças abruptas",
                        description: "Setpoint muda em degraus",
                        gains: { kp: 1.5, ki: 0.4, kd: 1.0 },
                        setpointProfile: [
                            { time: 0, value: 30 },
                            { time: 8, value: 70 },
                            { time: 16, value: 40 },
                            { time: 24, value: 80 }
                        ],
                        duration: 30,
                        explanation: "Degraus causam overshoot e derivative kick"
                    },
                    {
                        title: "Com setpoint weighting",
                        description: "Reduz derivative kick com pesos no setpoint",
                        gains: { kp: 1.5, ki: 0.4, kd: 1.0 },
                        setpointWeighting: { p: 0.8, d: 0.0 },
                        setpointProfile: [
                            { time: 0, value: 30 },
                            { time: 8, value: 70 },
                            { time: 16, value: 40 },
                            { time: 24, value: 80 }
                        ],
                        duration: 30,
                        explanation: "Setpoint weighting suaviza a resposta"
                    }
                ]
            },
            
            // Efeitos não-lineares
            nonlinear_effects: {
                name: "Efeitos Não-Lineares",
                description: "Saturação, zona morta e outras não-linearidades",
                steps: [
                    {
                        title: "Sistema linear ideal",
                        description: "Comportamento linear sem limitações",
                        gains: { kp: 2.0, ki: 0.6, kd: 1.5 },
                        setpoint: 80,
                        outputLimits: { min: -1000, max: 1000 },
                        duration: 15,
                        explanation: "Sistema ideal sem saturação ou limitações"
                    },
                    {
                        title: "Saturação da saída",
                        description: "Limitação da variável manipulada",
                        gains: { kp: 2.0, ki: 0.6, kd: 1.5 },
                        setpoint: 80,
                        outputLimits: { min: -50, max: 50 },
                        duration: 20,
                        explanation: "Saturação causa windup e degrada performance"
                    },
                    {
                        title: "Com anti-windup",
                        description: "Proteção contra windup integral",
                        gains: { kp: 2.0, ki: 0.6, kd: 1.5 },
                        setpoint: 80,
                        outputLimits: { min: -50, max: 50 },
                        antiWindup: true,
                        duration: 20,
                        explanation: "Anti-windup melhora a recuperação da saturação"
                    }
                ]
            },
            
            // Ruído e filtragem
            noise_filtering: {
                name: "Ruído e Filtragem",
                description: "Impacto do ruído e técnicas de filtragem",
                steps: [
                    {
                        title: "Sistema sem ruído",
                        description: "Medição perfeita, sem interferências",
                        gains: { kp: 1.5, ki: 0.5, kd: 2.0 },
                        setpoint: 60,
                        noise: { enabled: false },
                        duration: 15,
                        explanation: "Sem ruído, o termo D funciona perfeitamente"
                    },
                    {
                        title: "Com ruído no sensor",
                        description: "Ruído amplificado pelo termo derivativo",
                        gains: { kp: 1.5, ki: 0.5, kd: 2.0 },
                        setpoint: 60,
                        noise: { enabled: true, amplitude: 1.0 },
                        duration: 15,
                        explanation: "Ruído é amplificado pelo termo D, causando oscilação"
                    },
                    {
                        title: "Com filtro derivativo",
                        description: "Filtro passa-baixa no termo D",
                        gains: { kp: 1.5, ki: 0.5, kd: 2.0 },
                        setpoint: 60,
                        noise: { enabled: true, amplitude: 1.0 },
                        derivativeFilter: 0.1,
                        duration: 15,
                        explanation: "Filtro reduz o ruído mas adiciona atraso"
                    },
                    {
                        title: "Ganho D reduzido",
                        description: "Alternativa: reduzir o ganho derivativo",
                        gains: { kp: 1.5, ki: 0.5, kd: 0.5 },
                        setpoint: 60,
                        noise: { enabled: true, amplitude: 1.0 },
                        duration: 15,
                        explanation: "Kd menor reduz amplificação do ruído"
                    }
                ]
            }
        };
        
        this.currentScenario = null;
        this.currentStep = 0;
        this.stepStartTime = 0;
        this.isRunning = false;
        this.callbacks = {
            onStepStart: null,
            onStepEnd: null,
            onScenarioComplete: null
        };
    }
    
    getAvailableScenarios() {
        return Object.keys(this.scenarios).map(key => ({
            id: key,
            name: this.scenarios[key].name,
            description: this.scenarios[key].description,
            steps: this.scenarios[key].steps.length
        }));
    }
    
    startScenario(scenarioId, callbacks = {}) {
        if (!this.scenarios[scenarioId]) {
            throw new Error(`Cenário '${scenarioId}' não encontrado`);
        }
        
        this.currentScenario = scenarioId;
        this.currentStep = 0;
        this.stepStartTime = 0;
        this.isRunning = true;
        this.callbacks = { ...this.callbacks, ...callbacks };
        
        this.executeCurrentStep();
    }
    
    executeCurrentStep() {
        if (!this.isRunning || !this.currentScenario) return;
        
        const scenario = this.scenarios[this.currentScenario];
        const step = scenario.steps[this.currentStep];
        
        if (!step) {
            this.completeScenario();
            return;
        }
        
        // Notifica início do passo
        if (this.callbacks.onStepStart) {
            this.callbacks.onStepStart({
                scenario: scenario.name,
                step: this.currentStep + 1,
                totalSteps: scenario.steps.length,
                title: step.title,
                description: step.description,
                explanation: step.explanation,
                config: this.getStepConfiguration(step)
            });
        }
        
        this.stepStartTime = Date.now();
    }
    
    getStepConfiguration(step) {
        const config = {
            gains: step.gains || { kp: 1, ki: 0, kd: 0 },
            setpoint: step.setpoint || 50,
            duration: step.duration || 15
        };
        
        // Configurações opcionais
        if (step.outputLimits) config.outputLimits = step.outputLimits;
        if (step.antiWindup !== undefined) config.antiWindup = step.antiWindup;
        if (step.noise) config.noise = step.noise;
        if (step.derivativeFilter) config.derivativeFilter = step.derivativeFilter;
        if (step.setpointWeighting) config.setpointWeighting = step.setpointWeighting;
        if (step.disturbance) config.disturbance = step.disturbance;
        if (step.setpointProfile) config.setpointProfile = step.setpointProfile;
        
        return config;
    }
    
    update(currentTime) {
        if (!this.isRunning || !this.currentScenario) return;
        
        const scenario = this.scenarios[this.currentScenario];
        const step = scenario.steps[this.currentStep];
        
        if (!step) return;
        
        const elapsedTime = (Date.now() - this.stepStartTime) / 1000;
        
        // Verifica se o passo atual terminou
        if (elapsedTime >= step.duration) {
            this.nextStep();
        }
        
        // Retorna configuração atual (para setpoint profiles)
        return this.getCurrentConfiguration(step, elapsedTime);
    }
    
    getCurrentConfiguration(step, elapsedTime) {
        const config = this.getStepConfiguration(step);
        
        // Atualiza setpoint se há um profile
        if (step.setpointProfile) {
            config.setpoint = this.interpolateSetpoint(step.setpointProfile, elapsedTime);
        }
        
        // Aplica perturbação se configurada
        if (step.disturbance && 
            elapsedTime >= step.disturbance.time && 
            elapsedTime <= step.disturbance.time + step.disturbance.duration) {
            config.currentDisturbance = step.disturbance.value;
        }
        
        return config;
    }
    
    interpolateSetpoint(profile, currentTime) {
        // Encontra os pontos de interpolação
        let beforePoint = profile[0];
        let afterPoint = profile[profile.length - 1];
        
        for (let i = 0; i < profile.length - 1; i++) {
            if (currentTime >= profile[i].time && currentTime <= profile[i + 1].time) {
                beforePoint = profile[i];
                afterPoint = profile[i + 1];
                break;
            }
        }
        
        // Interpolação linear
        if (beforePoint.time === afterPoint.time) {
            return beforePoint.value;
        }
        
        const ratio = (currentTime - beforePoint.time) / (afterPoint.time - beforePoint.time);
        return beforePoint.value + ratio * (afterPoint.value - beforePoint.value);
    }
    
    nextStep() {
        if (!this.isRunning || !this.currentScenario) return;
        
        const scenario = this.scenarios[this.currentScenario];
        
        // Notifica fim do passo atual
        if (this.callbacks.onStepEnd) {
            this.callbacks.onStepEnd({
                step: this.currentStep + 1,
                totalSteps: scenario.steps.length
            });
        }
        
        this.currentStep++;
        
        if (this.currentStep >= scenario.steps.length) {
            this.completeScenario();
        } else {
            // Pequena pausa entre passos
            setTimeout(() => {
                this.executeCurrentStep();
            }, 1000);
        }
    }
    
    completeScenario() {
        this.isRunning = false;
        
        if (this.callbacks.onScenarioComplete) {
            this.callbacks.onScenarioComplete({
                scenario: this.scenarios[this.currentScenario].name,
                totalSteps: this.scenarios[this.currentScenario].steps.length
            });
        }
        
        this.currentScenario = null;
        this.currentStep = 0;
    }
    
    pauseScenario() {
        this.isRunning = false;
    }
    
    resumeScenario() {
        if (this.currentScenario) {
            this.isRunning = true;
            this.stepStartTime = Date.now(); // Reset timer
        }
    }
    
    stopScenario() {
        this.isRunning = false;
        this.currentScenario = null;
        this.currentStep = 0;
    }
    
    getCurrentStatus() {
        if (!this.currentScenario) {
            return { isRunning: false };
        }
        
        const scenario = this.scenarios[this.currentScenario];
        const step = scenario.steps[this.currentStep];
        
        return {
            isRunning: this.isRunning,
            scenario: scenario.name,
            currentStep: this.currentStep + 1,
            totalSteps: scenario.steps.length,
            stepTitle: step ? step.title : null,
            stepDescription: step ? step.description : null,
            stepExplanation: step ? step.explanation : null,
            progress: ((this.currentStep + 1) / scenario.steps.length) * 100
        };
    }
}