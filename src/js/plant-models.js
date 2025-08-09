export class MechanicalSystem {
    // Parâmetros Físicos
    _inertia; // Equivalente à massa do objeto
    _friction; // Coeficiente de atrito
    _load; // Força constante atuando no sistema (ex: gravidade)

    // Variáveis de Estado
    state = {
        position: 0,
        velocity: 0
    };

    // Perturbações externas
    _disturbance = 0;

    // ✨ NOVOS: Características mais realísticas
    sensorNoise = {
        enabled: false,
        amplitude: 0.5
    };

    systemDelay = {
        enabled: false,
        time: 0.1,
        buffer: []
    };

    simulationTime = 0;

    constructor(params) {
        this._inertia = params.inertia;
        this._friction = params.friction;
        this._load = params.load;

        // ✨ NOVO: Configurações opcionais
        this.sensorNoise.enabled = params.noiseEnabled || false;
        this.sensorNoise.amplitude = params.noiseAmplitude || 0.5;
        this.systemDelay.enabled = params.delayEnabled || false;
        this.systemDelay.time = params.delayTime || 0.1;

        if (params.autoEquilibrium) {
            this.state.position = params.initialPosition ?? 0;
        } else {
            this.state.position = params.initialPosition || 0;
        }
    }

    update(controlOutput, dt) {
        this.simulationTime += dt;
        
        // ✨ NOVO: Aplica atraso no sistema se habilitado
        let actualOutput = controlOutput;
        if (this.systemDelay.enabled) {
            actualOutput = this._applyDelay(controlOutput, dt);
        }

        // Física original (não mudou)
        const frictionForce = -this._friction * this.state.velocity;
        const loadForce = -this._load;
        const netForce = actualOutput + this._disturbance + frictionForce + loadForce;
        const acceleration = netForce / this._inertia;

        this.state.velocity += acceleration * dt;
        this.state.position += this.state.velocity * dt;

        // ✨ NOVO: Adiciona ruído no sensor se habilitado
        let measuredPosition = this.state.position;
        if (this.sensorNoise.enabled) {
            measuredPosition = this._addSensorNoise(this.state.position);
        }

        return {
            ...this.state,
            measuredPosition: measuredPosition // ✨ Novo campo
        };
    }

    // ✨ NOVO: Implementa atraso no sistema
    _applyDelay(input, dt) {
        this.systemDelay.buffer.push({
            value: input,
            time: this.simulationTime
        });

        // Remove dados muito antigos
        const cutoffTime = this.simulationTime - this.systemDelay.time * 3;
        this.systemDelay.buffer = this.systemDelay.buffer.filter(
            item => item.time > cutoffTime
        );

        // Busca valor com atraso
        const targetTime = this.simulationTime - this.systemDelay.time;
        let output = input; // Fallback

        for (let i = this.systemDelay.buffer.length - 1; i >= 0; i--) {
            if (this.systemDelay.buffer[i].time <= targetTime) {
                output = this.systemDelay.buffer[i].value;
                break;
            }
        }

        return output;
    }

    // ✨ NOVO: Adiciona ruído realístico
    _addSensorNoise(cleanSignal) {
        const sinusoidalNoise = Math.sin(this.simulationTime * 8) * 0.4 +
                               Math.sin(this.simulationTime * 20.3) * 0.15;
        const randomNoise = (Math.random() - 0.5) * 0.5;
        
        const totalNoise = (sinusoidalNoise + randomNoise) * this.sensorNoise.amplitude;
        return cleanSignal + totalNoise;
    }

    // ✨ NOVOS: Métodos para controlar características em tempo real
    enableNoise(amplitude = 0.5) {
        this.sensorNoise.enabled = true;
        this.sensorNoise.amplitude = amplitude;
    }

    disableNoise() {
        this.sensorNoise.enabled = false;
    }

    enableDelay(delayTime = 0.1) {
        this.systemDelay.enabled = true;
        this.systemDelay.time = delayTime;
    }

    disableDelay() {
        this.systemDelay.enabled = false;
        this.systemDelay.buffer = [];
    }

    setDisturbance(value) {
        this._disturbance = value;
    }

    reset() {
        this.state.velocity = 0;
        this._disturbance = 0;
        this.systemDelay.buffer = []; // ✨ NOVO
        this.simulationTime = 0;      // ✨ NOVO
    }
}