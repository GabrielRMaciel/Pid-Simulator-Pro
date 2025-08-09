/**
 * Sistema avançado de análise de performance para controle PID
 * Baseado no PRD - Seção 3.3
 */

export class PerformanceAnalyzer {
    constructor() {
        this.data = {
            time: [],
            setpoint: [],
            processVariable: [],
            controlOutput: [],
            error: []
        };
        
        this.metrics = {
            // Métricas de erro
            iae: 0,           // Integral Absolute Error
            ise: 0,           // Integral Squared Error
            itae: 0,          // Integral Time Absolute Error
            itse: 0,          // Integral Time Squared Error
            
            // Métricas de resposta
            overshoot: 0,     // Overshoot máximo (%)
            undershoot: 0,    // Undershoot máximo (%)
            settlingTime: null, // Tempo de acomodação (s)
            riseTime: null,   // Tempo de subida (s)
            peakTime: null,   // Tempo de pico (s)
            
            // Métricas de regime permanente
            steadyStateError: 0,    // Erro em regime permanente
            steadyStateValue: 0,    // Valor em regime permanente
            
            // Métricas de controle
            controlEffort: 0,       // Esforço de controle total
            controlVariability: 0,  // Variabilidade do sinal de controle
            
            // Métricas de qualidade
            performanceIndex: 0,    // Índice de performance geral
            stabilityMargin: 0,     // Margem de estabilidade estimada
            robustness: 0          // Índice de robustez
        };
        
        this.analysisWindow = 200; // Pontos para análise de regime permanente
        this.settlingBand = 0.02;  // 2% para critério de acomodação
        this.isStepResponse = false;
        this.stepStartTime = null;
        this.stepStartValue = null;
        this.stepEndValue = null;
    }
    
    update(time, setpoint, pv, output) {
        // Armazena dados
        this.data.time.push(time);
        this.data.setpoint.push(setpoint);
        this.data.processVariable.push(pv);
        this.data.controlOutput.push(output);
        this.data.error.push(setpoint - pv);
        
        // Limita o tamanho do histórico
        const maxPoints = 1000;
        if (this.data.time.length > maxPoints) {
            Object.keys(this.data).forEach(key => {
                this.data[key].shift();
            });
        }
        
        // Detecta mudança de setpoint (resposta ao degrau)
        this.detectStepChange(setpoint, time);
        
        // Atualiza métricas continuamente
        this.updateContinuousMetrics(time);
        
        // Se é resposta ao degrau, calcula métricas específicas
        if (this.isStepResponse) {
            this.updateStepResponseMetrics();
        }
        
        // Calcula índice de performance geral
        this.calculatePerformanceIndex();
    }
    
    detectStepChange(currentSetpoint, currentTime) {
        if (this.data.setpoint.length < 2) return;
        
        const previousSetpoint = this.data.setpoint[this.data.setpoint.length - 2];
        const setpointChange = Math.abs(currentSetpoint - previousSetpoint);
        
        // Detecta mudança significativa no setpoint
        if (setpointChange > 0.1) {
            this.isStepResponse = true;
            this.stepStartTime = currentTime;
            this.stepStartValue = this.data.processVariable[this.data.processVariable.length - 1];
            this.stepEndValue = currentSetpoint;
            
            // Reset métricas de resposta ao degrau
            this.metrics.overshoot = 0;
            this.metrics.undershoot = 0;
            this.metrics.settlingTime = null;
            this.metrics.riseTime = null;
            this.metrics.peakTime = null;
        }
    }
    
    updateContinuousMetrics(currentTime) {
        if (this.data.error.length === 0) return;
        
        const dt = this.data.time.length > 1 ? 
            this.data.time[this.data.time.length - 1] - this.data.time[this.data.time.length - 2] : 0.04;
        
        const currentError = this.data.error[this.data.error.length - 1];
        const currentOutput = this.data.controlOutput[this.data.controlOutput.length - 1];
        
        // Atualiza métricas integrais
        this.metrics.iae += Math.abs(currentError) * dt;
        this.metrics.ise += currentError * currentError * dt;
        this.metrics.itae += currentTime * Math.abs(currentError) * dt;
        this.metrics.itse += currentTime * currentError * currentError * dt;
        
        // Esforço de controle
        this.metrics.controlEffort += Math.abs(currentOutput) * dt;
        
        // Variabilidade do controle
        if (this.data.controlOutput.length > 1) {
            const outputChange = Math.abs(currentOutput - this.data.controlOutput[this.data.controlOutput.length - 2]);
            this.metrics.controlVariability += outputChange;
        }
        
        // Erro em regime permanente (média dos últimos pontos)
        if (this.data.error.length >= this.analysisWindow) {
            const recentErrors = this.data.error.slice(-this.analysisWindow);
            this.metrics.steadyStateError = recentErrors.reduce((sum, err) => sum + err, 0) / recentErrors.length;
            
            const recentPVs = this.data.processVariable.slice(-this.analysisWindow);
            this.metrics.steadyStateValue = recentPVs.reduce((sum, pv) => sum + pv, 0) / recentPVs.length;
        }
    }
    
    updateStepResponseMetrics() {
        if (!this.isStepResponse || this.stepStartTime === null) return;
        
        const stepData = this.getStepResponseData();
        if (stepData.length < 10) return; // Precisa de dados suficientes
        
        const stepSize = this.stepEndValue - this.stepStartValue;
        if (Math.abs(stepSize) < 0.1) return; // Mudança muito pequena
        
        // Calcula overshoot/undershoot
        let maxValue = -Infinity;
        let minValue = Infinity;
        let maxTime = null;
        let minTime = null;
        
        stepData.forEach(point => {
            if (point.pv > maxValue) {
                maxValue = point.pv;
                maxTime = point.time;
            }
            if (point.pv < minValue) {
                minValue = point.pv;
                minTime = point.time;
            }
        });
        
        if (stepSize > 0) {
            // Degrau positivo
            this.metrics.overshoot = Math.max(0, ((maxValue - this.stepEndValue) / stepSize) * 100);
            this.metrics.peakTime = maxTime - this.stepStartTime;
        } else {
            // Degrau negativo
            this.metrics.undershoot = Math.max(0, ((this.stepEndValue - minValue) / Math.abs(stepSize)) * 100);
            this.metrics.peakTime = minTime - this.stepStartTime;
        }
        
        // Tempo de subida (10% a 90% do valor final)
        this.calculateRiseTime(stepData, stepSize);
        
        // Tempo de acomodação (dentro de 2% do valor final)
        this.calculateSettlingTime(stepData);
    }
    
    calculateRiseTime(stepData, stepSize) {
        const target10 = this.stepStartValue + 0.1 * stepSize;
        const target90 = this.stepStartValue + 0.9 * stepSize;
        
        let time10 = null;
        let time90 = null;
        
        for (let i = 0; i < stepData.length; i++) {
            const point = stepData[i];
            
            if (time10 === null && 
                ((stepSize > 0 && point.pv >= target10) || (stepSize < 0 && point.pv <= target10))) {
                time10 = point.time - this.stepStartTime;
            }
            
            if (time90 === null && 
                ((stepSize > 0 && point.pv >= target90) || (stepSize < 0 && point.pv <= target90))) {
                time90 = point.time - this.stepStartTime;
                break;
            }
        }
        
        if (time10 !== null && time90 !== null) {
            this.metrics.riseTime = time90 - time10;
        }
    }
    
    calculateSettlingTime(stepData) {
        const settlingBand = this.stepEndValue * this.settlingBand;
        const upperBound = this.stepEndValue + settlingBand;
        const lowerBound = this.stepEndValue - settlingBand;
        
        // Procura o último ponto que saiu da banda de acomodação
        let lastExcursion = null;
        
        for (let i = stepData.length - 1; i >= 0; i--) {
            const point = stepData[i];
            
            if (point.pv > upperBound || point.pv < lowerBound) {
                lastExcursion = point.time - this.stepStartTime;
                break;
            }
        }
        
        this.metrics.settlingTime = lastExcursion;
    }
    
    getStepResponseData() {
        if (!this.isStepResponse || this.stepStartTime === null) return [];
        
        const stepData = [];
        for (let i = 0; i < this.data.time.length; i++) {
            if (this.data.time[i] >= this.stepStartTime) {
                stepData.push({
                    time: this.data.time[i],
                    pv: this.data.processVariable[i],
                    setpoint: this.data.setpoint[i],
                    output: this.data.controlOutput[i]
                });
            }
        }
        return stepData;
    }
    
    calculatePerformanceIndex() {
        // Índice de performance baseado em múltiplos critérios
        let score = 100;
        
        // Penaliza overshoot excessivo
        if (this.metrics.overshoot > 20) {
            score -= (this.metrics.overshoot - 20) * 2;
        }
        
        // Penaliza erro em regime permanente
        score -= Math.abs(this.metrics.steadyStateError) * 10;
        
        // Penaliza tempo de acomodação longo
        if (this.metrics.settlingTime && this.metrics.settlingTime > 10) {
            score -= (this.metrics.settlingTime - 10) * 2;
        }
        
        // Penaliza variabilidade excessiva do controle
        if (this.metrics.controlVariability > 50) {
            score -= (this.metrics.controlVariability - 50) * 0.5;
        }
        
        this.metrics.performanceIndex = Math.max(0, Math.min(100, score));
    }
    
    generateReport() {
        return {
            summary: {
                performanceIndex: this.metrics.performanceIndex,
                quality: this.getQualityAssessment(),
                recommendation: this.getRecommendation()
            },
            errorMetrics: {
                iae: this.metrics.iae,
                ise: this.metrics.ise,
                itae: this.metrics.itae,
                itse: this.metrics.itse,
                steadyStateError: this.metrics.steadyStateError
            },
            responseMetrics: {
                overshoot: this.metrics.overshoot,
                undershoot: this.metrics.undershoot,
                settlingTime: this.metrics.settlingTime,
                riseTime: this.metrics.riseTime,
                peakTime: this.metrics.peakTime
            },
            controlMetrics: {
                controlEffort: this.metrics.controlEffort,
                controlVariability: this.metrics.controlVariability
            }
        };
    }
    
    getQualityAssessment() {
        const score = this.metrics.performanceIndex;
        
        if (score >= 90) return "Excelente";
        if (score >= 80) return "Muito Bom";
        if (score >= 70) return "Bom";
        if (score >= 60) return "Aceitável";
        if (score >= 50) return "Ruim";
        return "Muito Ruim";
    }
    
    getRecommendation() {
        const recommendations = [];
        
        if (this.metrics.overshoot > 15) {
            recommendations.push("Reduza Kp ou aumente Kd para diminuir overshoot");
        }
        
        if (Math.abs(this.metrics.steadyStateError) > 1) {
            recommendations.push("Aumente Ki para eliminar erro em regime permanente");
        }
        
        if (this.metrics.settlingTime && this.metrics.settlingTime > 15) {
            recommendations.push("Ajuste os ganhos para resposta mais rápida");
        }
        
        if (this.metrics.controlVariability > 100) {
            recommendations.push("Reduza Kd ou adicione filtro para diminuir ruído");
        }
        
        if (recommendations.length === 0) {
            recommendations.push("Sistema bem sintonizado!");
        }
        
        return recommendations;
    }
    
    reset() {
        // Limpa dados
        Object.keys(this.data).forEach(key => {
            this.data[key] = [];
        });
        
        // Reset métricas
        Object.keys(this.metrics).forEach(key => {
            if (typeof this.metrics[key] === 'number') {
                this.metrics[key] = 0;
            } else {
                this.metrics[key] = null;
            }
        });
        
        this.isStepResponse = false;
        this.stepStartTime = null;
        this.stepStartValue = null;
        this.stepEndValue = null;
    }
    
    exportData() {
        return {
            data: { ...this.data },
            metrics: { ...this.metrics },
            timestamp: new Date().toISOString()
        };
    }
}