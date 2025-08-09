/**
 * Modelos de plantas industriais realísticas para simulação PID
 * Baseado no PRD - Seção 3.1
 */

export class TemperatureControlSystem {
    constructor(params = {}) {
        // Parâmetros físicos do sistema térmico
        this.thermalCapacity = params.thermalCapacity || 500; // J/K
        this.thermalResistance = params.thermalResistance || 0.1; // K/W
        this.ambientTemp = params.ambientTemp || 25; // °C
        this.maxHeatingPower = params.maxHeatingPower || 2000; // W
        this.timeConstant = this.thermalCapacity * this.thermalResistance;
        
        // Estado do sistema
        this.state = {
            temperature: this.ambientTemp,
            heatFlow: 0
        };
        
        // Perturbações
        this.disturbances = {
            ambientTempChange: 0,
            doorOpening: false,
            doorOpeningEffect: -50 // W de perda quando porta abre
        };
        
        this.simulationTime = 0;
    }
    
    update(heatingPower, dt) {
        this.simulationTime += dt;
        
        // Satura a potência de aquecimento
        const actualPower = Math.max(0, Math.min(this.maxHeatingPower, heatingPower));
        
        // Calcula perdas térmicas para o ambiente
        const currentAmbient = this.ambientTemp + this.disturbances.ambientTempChange;
        const thermalLoss = (this.state.temperature - currentAmbient) / this.thermalResistance;
        
        // Efeito da abertura de porta (perturbação)
        const doorEffect = this.disturbances.doorOpening ? this.disturbances.doorOpeningEffect : 0;
        
        // Balanço energético: dT/dt = (Pin - Ploss) / C
        const netHeatFlow = actualPower - thermalLoss + doorEffect;
        const tempChange = netHeatFlow / this.thermalCapacity;
        
        this.state.temperature += tempChange * dt;
        this.state.heatFlow = netHeatFlow;
        
        return {
            processVariable: this.state.temperature,
            actualOutput: actualPower,
            disturbanceEffect: doorEffect,
            thermalLoss: thermalLoss
        };
    }
    
    setDisturbance(type, value) {
        if (type === 'ambient') {
            this.disturbances.ambientTempChange = value;
        } else if (type === 'door') {
            this.disturbances.doorOpening = value;
        }
    }
    
    reset() {
        this.state.temperature = this.ambientTemp;
        this.state.heatFlow = 0;
        this.disturbances.ambientTempChange = 0;
        this.disturbances.doorOpening = false;
        this.simulationTime = 0;
    }
}

export class TankLevelSystem {
    constructor(params = {}) {
        // Parâmetros do tanque
        this.tankArea = params.tankArea || 2.0; // m²
        this.maxOutletFlow = params.maxOutletFlow || 0.05; // m³/s
        this.outletCoefficient = params.outletCoefficient || 0.1;
        this.maxLevel = params.maxLevel || 5.0; // m
        
        // Estado do sistema
        this.state = {
            level: 1.0, // m
            inletFlow: 0.02, // m³/s
            outletFlow: 0
        };
        
        // Perturbações
        this.disturbances = {
            inletFlowVariation: 0,
            leakage: 0
        };
        
        this.simulationTime = 0;
    }
    
    update(valveOpening, dt) {
        this.simulationTime += dt;
        
        // Satura abertura da válvula (0-100%)
        const actualValveOpening = Math.max(0, Math.min(100, valveOpening)) / 100;
        
        // Vazão de saída (não-linear com a altura)
        const pressureHead = Math.max(0, this.state.level);
        this.state.outletFlow = actualValveOpening * this.maxOutletFlow * Math.sqrt(pressureHead);
        
        // Vazão de entrada com perturbação
        const actualInletFlow = this.state.inletFlow + this.disturbances.inletFlowVariation;
        
        // Vazamento (perturbação)
        const leakageFlow = this.disturbances.leakage;
        
        // Balanço de massa: dh/dt = (Qin - Qout - Qleak) / A
        const netFlow = actualInletFlow - this.state.outletFlow - leakageFlow;
        const levelChange = netFlow / this.tankArea;
        
        this.state.level += levelChange * dt;
        
        // Limita o nível (não pode ser negativo ou exceder o tanque)
        this.state.level = Math.max(0, Math.min(this.maxLevel, this.state.level));
        
        return {
            processVariable: this.state.level,
            actualOutput: actualValveOpening * 100,
            inletFlow: actualInletFlow,
            outletFlow: this.state.outletFlow,
            netFlow: netFlow
        };
    }
    
    setDisturbance(type, value) {
        if (type === 'inlet') {
            this.disturbances.inletFlowVariation = value;
        } else if (type === 'leak') {
            this.disturbances.leakage = value;
        }
    }
    
    reset() {
        this.state.level = 1.0;
        this.state.outletFlow = 0;
        this.disturbances.inletFlowVariation = 0;
        this.disturbances.leakage = 0;
        this.simulationTime = 0;
    }
}

export class MotorSpeedSystem {
    constructor(params = {}) {
        // Parâmetros do motor
        this.inertia = params.inertia || 0.01; // kg⋅m²
        this.friction = params.friction || 0.1; // N⋅m⋅s/rad
        this.torqueConstant = params.torqueConstant || 0.5; // N⋅m/A
        this.maxCurrent = params.maxCurrent || 10; // A
        this.gearRatio = params.gearRatio || 10;
        
        // Estado do sistema
        this.state = {
            angularVelocity: 0, // rad/s
            rpm: 0,
            torque: 0
        };
        
        // Perturbações
        this.disturbances = {
            loadTorque: 0,
            frictionVariation: 1.0
        };
        
        this.simulationTime = 0;
    }
    
    update(currentCommand, dt) {
        this.simulationTime += dt;
        
        // Satura a corrente
        const actualCurrent = Math.max(-this.maxCurrent, Math.min(this.maxCurrent, currentCommand));
        
        // Torque do motor
        const motorTorque = this.torqueConstant * actualCurrent;
        
        // Torque de atrito (com variação)
        const frictionTorque = this.friction * this.disturbances.frictionVariation * this.state.angularVelocity;
        
        // Torque de carga (perturbação)
        const loadTorque = this.disturbances.loadTorque;
        
        // Equação dinâmica: J⋅dω/dt = Tm - Tf - Tl
        const netTorque = motorTorque - frictionTorque - loadTorque;
        const acceleration = netTorque / this.inertia;
        
        this.state.angularVelocity += acceleration * dt;
        this.state.rpm = (this.state.angularVelocity * 60) / (2 * Math.PI) * this.gearRatio;
        this.state.torque = motorTorque;
        
        return {
            processVariable: this.state.rpm,
            actualOutput: actualCurrent,
            motorTorque: motorTorque,
            frictionTorque: frictionTorque,
            loadTorque: loadTorque
        };
    }
    
    setDisturbance(type, value) {
        if (type === 'load') {
            this.disturbances.loadTorque = value;
        } else if (type === 'friction') {
            this.disturbances.frictionVariation = value;
        }
    }
    
    reset() {
        this.state.angularVelocity = 0;
        this.state.rpm = 0;
        this.state.torque = 0;
        this.disturbances.loadTorque = 0;
        this.disturbances.frictionVariation = 1.0;
        this.simulationTime = 0;
    }
}

export class PressureControlSystem {
    constructor(params = {}) {
        // Parâmetros do sistema pneumático
        this.volume = params.volume || 0.1; // m³
        this.gasConstant = 287; // J/(kg⋅K) para ar
        this.temperature = params.temperature || 293; // K (20°C)
        this.atmosphericPressure = 101325; // Pa
        this.maxInletFlow = params.maxInletFlow || 0.01; // kg/s
        this.outletCoefficient = params.outletCoefficient || 0.0001;
        
        // Estado do sistema
        this.state = {
            pressure: this.atmosphericPressure + 50000, // Pa (0.5 bar gauge)
            mass: 0
        };
        
        // Calcula massa inicial
        this.state.mass = (this.state.pressure * this.volume) / (this.gasConstant * this.temperature);
        
        // Perturbações
        this.disturbances = {
            outletFlowVariation: 1.0,
            leakage: 0,
            temperatureChange: 0
        };
        
        this.simulationTime = 0;
    }
    
    update(valveOpening, dt) {
        this.simulationTime += dt;
        
        // Satura abertura da válvula (0-100%)
        const actualValveOpening = Math.max(0, Math.min(100, valveOpening)) / 100;
        
        // Vazão mássica de entrada
        const inletMassFlow = actualValveOpening * this.maxInletFlow;
        
        // Vazão mássica de saída (dependente da pressão)
        const pressureDiff = Math.max(0, this.state.pressure - this.atmosphericPressure);
        const outletMassFlow = this.outletCoefficient * this.disturbances.outletFlowVariation * Math.sqrt(pressureDiff);
        
        // Vazamento (perturbação)
        const leakageMassFlow = this.disturbances.leakage;
        
        // Balanço de massa: dm/dt = min - mout - mleak
        const netMassFlow = inletMassFlow - outletMassFlow - leakageMassFlow;
        this.state.mass += netMassFlow * dt;
        
        // Evita massa negativa
        this.state.mass = Math.max(0.001, this.state.mass);
        
        // Temperatura atual (com perturbação)
        const currentTemp = this.temperature + this.disturbances.temperatureChange;
        
        // Lei dos gases ideais: P = (m⋅R⋅T) / V
        this.state.pressure = (this.state.mass * this.gasConstant * currentTemp) / this.volume;
        
        return {
            processVariable: (this.state.pressure - this.atmosphericPressure) / 1000, // kPa gauge
            actualOutput: actualValveOpening * 100,
            inletFlow: inletMassFlow,
            outletFlow: outletMassFlow,
            netFlow: netMassFlow
        };
    }
    
    setDisturbance(type, value) {
        if (type === 'outlet') {
            this.disturbances.outletFlowVariation = value;
        } else if (type === 'leak') {
            this.disturbances.leakage = value;
        } else if (type === 'temperature') {
            this.disturbances.temperatureChange = value;
        }
    }
    
    reset() {
        this.state.pressure = this.atmosphericPressure + 50000;
        this.state.mass = (this.state.pressure * this.volume) / (this.gasConstant * this.temperature);
        this.disturbances.outletFlowVariation = 1.0;
        this.disturbances.leakage = 0;
        this.disturbances.temperatureChange = 0;
        this.simulationTime = 0;
    }
}