/**
 * Controlador PID Avançado com recursos industriais
 * Baseado no PRD - Seção 3.2
 */

export class AdvancedPIDController {
    constructor(Kp = 1, Ki = 0, Kd = 0, options = {}) {
        // Ganhos principais
        this._Kp = Kp;
        this._Ki = Ki;
        this._Kd = Kd;
        
        // Configurações avançadas
        this.config = {
            outputMin: options.outputMin || -100,
            outputMax: options.outputMax || 100,
            derivativeFilter: options.derivativeFilter || 0.1,
            setpointWeightP: options.setpointWeightP || 1.0,
            setpointWeightD: options.setpointWeightD || 0.0,
            integralMode: options.integralMode || 'standard', // 'standard' ou 'conditional'
            antiWindupMethod: options.antiWindupMethod || 'clamping' // 'clamping' ou 'back-calculation'
        };
        
        // Estado interno
        this.state = {
            lastError: 0,
            lastPV: 0,
            integralSum: 0,
            derivativeFiltered: 0,
            lastOutput: 0,
            isManual: false,
            manualOutput: 0
        };
        
        // Termos para análise
        this.terms = {
            proportional: 0,
            integral: 0,
            derivative: 0,
            total: 0
        };
        
        // Métricas de performance
        this.metrics = {
            integralAbsoluteError: 0,
            integralSquaredError: 0,
            integralTimeAbsoluteError: 0,
            maxOutput: 0,
            outputVariability: 0,
            lastOutputs: []
        };
        
        this.simulationTime = 0;
    }
    
    update(setpoint, processVariable, deltaTime) {
        this.simulationTime += deltaTime;
        
        if (deltaTime <= 0) return this.state.lastOutput;
        
        // Modo manual
        if (this.state.isManual) {
            this.state.lastOutput = this.state.manualOutput;
            return this.state.lastOutput;
        }
        
        const error = setpoint - processVariable;
        
        // === TERMO PROPORCIONAL ===
        // Com setpoint weighting para reduzir kick no setpoint
        const proportionalError = (this.config.setpointWeightP * setpoint) - processVariable;
        this.terms.proportional = this._Kp * proportionalError;
        
        // === TERMO INTEGRAL ===
        // Integral condicional (só integra se não saturado)
        if (this.config.integralMode === 'conditional') {
            const wouldSaturate = Math.abs(this.state.lastOutput) >= Math.abs(this.config.outputMax * 0.95);
            if (!wouldSaturate || (error * this.state.integralSum < 0)) {
                this.state.integralSum += error * deltaTime;
            }
        } else {
            this.state.integralSum += error * deltaTime;
        }
        
        this.terms.integral = this._Ki * this.state.integralSum;
        
        // === TERMO DERIVATIVO ===
        // Derivada da PV (não do erro) para evitar derivative kick
        const pvDerivative = (processVariable - this.state.lastPV) / deltaTime;
        
        // Filtro passa-baixa no termo derivativo
        const alpha = this.config.derivativeFilter;
        this.state.derivativeFiltered = alpha * (-pvDerivative) + (1 - alpha) * this.state.derivativeFiltered;
        
        // Com setpoint weighting
        const derivativeSetpointEffect = this.config.setpointWeightD * (setpoint - this.state.lastPV) / deltaTime;
        this.terms.derivative = this._Kd * (this.state.derivativeFiltered + derivativeSetpointEffect);
        
        // === SAÍDA TOTAL ===
        let output = this.terms.proportional + this.terms.integral + this.terms.derivative;
        
        // === ANTI-WINDUP ===
        if (this.config.antiWindupMethod === 'clamping') {
            // Método de clamping
            const saturatedOutput = Math.max(this.config.outputMin, Math.min(this.config.outputMax, output));
            
            // Se saturou, ajusta o termo integral
            if (saturatedOutput !== output) {
                const excessOutput = output - saturatedOutput;
                this.state.integralSum -= excessOutput / this._Ki;
                this.terms.integral = this._Ki * this.state.integralSum;
                output = saturatedOutput;
            }
        } else if (this.config.antiWindupMethod === 'back-calculation') {
            // Método de back-calculation
            const saturatedOutput = Math.max(this.config.outputMin, Math.min(this.config.outputMax, output));
            
            if (saturatedOutput !== output && this._Ki !== 0) {
                const Tt = 1.0; // Constante de tempo de tracking
                const backCalcError = (saturatedOutput - output) / Tt;
                this.state.integralSum += backCalcError * deltaTime;
                this.terms.integral = this._Ki * this.state.integralSum;
            }
            
            output = saturatedOutput;
        }
        
        // === ATUALIZAÇÃO DE MÉTRICAS ===
        this.updateMetrics(error, output, deltaTime);
        
        // === ARMAZENAMENTO PARA PRÓXIMA ITERAÇÃO ===
        this.state.lastError = error;
        this.state.lastPV = processVariable;
        this.state.lastOutput = output;
        this.terms.total = output;
        
        return output;
    }
    
    updateMetrics(error, output, deltaTime) {
        // IAE - Integral Absolute Error
        this.metrics.integralAbsoluteError += Math.abs(error) * deltaTime;
        
        // ISE - Integral Squared Error
        this.metrics.integralSquaredError += error * error * deltaTime;
        
        // ITAE - Integral Time Absolute Error
        this.metrics.integralTimeAbsoluteError += this.simulationTime * Math.abs(error) * deltaTime;
        
        // Máxima saída
        this.metrics.maxOutput = Math.max(this.metrics.maxOutput, Math.abs(output));
        
        // Variabilidade da saída
        this.metrics.lastOutputs.push(output);
        if (this.metrics.lastOutputs.length > 50) {
            this.metrics.lastOutputs.shift();
        }
        
        if (this.metrics.lastOutputs.length > 1) {
            const outputChanges = this.metrics.lastOutputs.slice(1).map((val, i) => 
                Math.abs(val - this.metrics.lastOutputs[i])
            );
            this.metrics.outputVariability = outputChanges.reduce((sum, change) => sum + change, 0) / outputChanges.length;
        }
    }
    
    // === MÉTODOS DE CONFIGURAÇÃO ===
    setGains(Kp, Ki, Kd) {
        this._Kp = Kp;
        this._Ki = Ki;
        this._Kd = Kd;
    }
    
    setOutputLimits(min, max) {
        this.config.outputMin = min;
        this.config.outputMax = max;
    }
    
    setSetpointWeighting(weightP, weightD) {
        this.config.setpointWeightP = weightP;
        this.config.setpointWeightD = weightD;
    }
    
    setDerivativeFilter(alpha) {
        this.config.derivativeFilter = alpha;
    }
    
    // === MODO MANUAL/AUTOMÁTICO ===
    setManualMode(isManual, manualOutput = 0) {
        if (isManual && !this.state.isManual) {
            // Transição para manual - bumpless transfer
            this.state.manualOutput = this.state.lastOutput;
        } else if (!isManual && this.state.isManual) {
            // Transição para automático - bumpless transfer
            this.state.integralSum = this.state.manualOutput / this._Ki;
            this.terms.integral = this.state.manualOutput;
        }
        
        this.state.isManual = isManual;
        if (isManual) {
            this.state.manualOutput = manualOutput;
        }
    }
    
    // === SINTONIA AUTOMÁTICA ===
    autoTuneZieglerNichols(ultimateGain, ultimatePeriod) {
        // Método Ziegler-Nichols baseado na oscilação crítica
        const Ku = ultimateGain;
        const Tu = ultimatePeriod;
        
        this._Kp = 0.6 * Ku;
        this._Ki = (1.2 * Ku) / Tu;
        this._Kd = (0.6 * Ku * Tu) / 8;
        
        return {
            Kp: this._Kp,
            Ki: this._Ki,
            Kd: this._Kd,
            method: 'Ziegler-Nichols'
        };
    }
    
    autoTuneCohenCoon(processGain, timeConstant, deadTime) {
        // Método Cohen-Coon para sistemas de primeira ordem com atraso
        const K = processGain;
        const tau = timeConstant;
        const L = deadTime;
        
        const ratio = L / tau;
        
        this._Kp = (1.35 / K) * (tau / L) * (1 + 0.18 * ratio);
        this._Ki = this._Kp / (tau * (2.5 - 2 * ratio) / (1 + 0.39 * ratio));
        this._Kd = this._Kp * tau * (0.37 - 0.37 * ratio) / (1 + 0.81 * ratio);
        
        return {
            Kp: this._Kp,
            Ki: this._Ki,
            Kd: this._Kd,
            method: 'Cohen-Coon'
        };
    }
    
    autoTuneLambda(processGain, timeConstant, deadTime, closedLoopTimeConstant) {
        // Método Lambda Tuning (IMC)
        const K = processGain;
        const tau = timeConstant;
        const L = deadTime;
        const lambda = closedLoopTimeConstant;
        
        this._Kp = tau / (K * (lambda + L));
        this._Ki = this._Kp / tau;
        this._Kd = 0; // Lambda tuning geralmente não usa derivativo
        
        return {
            Kp: this._Kp,
            Ki: this._Ki,
            Kd: this._Kd,
            method: 'Lambda Tuning'
        };
    }
    
    // === RESET E DIAGNÓSTICO ===
    reset() {
        this.state.lastError = 0;
        this.state.lastPV = 0;
        this.state.integralSum = 0;
        this.state.derivativeFiltered = 0;
        this.state.lastOutput = 0;
        this.state.isManual = false;
        this.state.manualOutput = 0;
        
        this.terms.proportional = 0;
        this.terms.integral = 0;
        this.terms.derivative = 0;
        this.terms.total = 0;
        
        this.metrics.integralAbsoluteError = 0;
        this.metrics.integralSquaredError = 0;
        this.metrics.integralTimeAbsoluteError = 0;
        this.metrics.maxOutput = 0;
        this.metrics.outputVariability = 0;
        this.metrics.lastOutputs = [];
        
        this.simulationTime = 0;
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
    
    getTerms() {
        return { ...this.terms };
    }
    
    getConfiguration() {
        return {
            gains: { Kp: this._Kp, Ki: this._Ki, Kd: this._Kd },
            config: { ...this.config },
            state: { ...this.state }
        };
    }
}