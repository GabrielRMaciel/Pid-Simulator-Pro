export class SystemAnalyzer {
    constructor() {
        this.dataHistory = {
            errors: [],
            outputs: [],
            processValues: [],
            timestamps: []
        };
        
        this.metrics = {
            iae: 0,
            ise: 0,
            overshoot: 0,
            settlingTime: null,
            steadyStateError: 0
        };
    }
    
    update(setpoint, pv, mv, timestamp) {
        const error = setpoint - pv;
        
        this.dataHistory.errors.push(error);
        this.dataHistory.outputs.push(mv);
        this.dataHistory.processValues.push(pv);
        this.dataHistory.timestamps.push(timestamp);
        
        if (this.dataHistory.errors.length > 500) {
            Object.keys(this.dataHistory).forEach(key => {
                this.dataHistory[key].shift();
            });
        }
        
        this._calculateMetrics(setpoint);
    }
    
    _calculateMetrics(setpoint) {
        const dt = 0.04;
        
        // IAE
        this.metrics.iae = this.dataHistory.errors
            .reduce((sum, err) => sum + Math.abs(err) * dt, 0);
        
        // Overshoot
        const maxPV = Math.max(...this.dataHistory.processValues.slice(-100));
        this.metrics.overshoot = Math.max(0, ((maxPV - setpoint) / setpoint) * 100);
        
        // Erro em regime permanente
        const recentErrors = this.dataHistory.errors.slice(-20);
        this.metrics.steadyStateError = recentErrors.length > 0 ? 
            recentErrors.reduce((sum, err) => sum + err, 0) / recentErrors.length : 0;
    }
    
    generateReport() {
        let quality = "Estável";
        if (this.metrics.overshoot > 20) quality = "Instável";
        else if (this.metrics.overshoot > 10) quality = "Oscilatório";
        else if (Math.abs(this.metrics.steadyStateError) > 2) quality = "Erro Residual";
        else if (this.metrics.iae < 30) quality = "Excelente";
        
        return { ...this.metrics, quality };
    }
}