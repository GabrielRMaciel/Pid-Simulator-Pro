export class SmartTipsSystem {
    getTip(metrics, pidTerms) {
        if (metrics.overshoot > 20) {
            return "💡 Overshoot alto! Reduza Kp ou aumente Kd para estabilizar";
        }
        
        if (Math.abs(metrics.steadyStateError) > 2) {
            return "🎯 Erro residual detectado! Aumente Ki para eliminar offset";
        }
        
        if (Math.abs(pidTerms.derivative) > Math.abs(pidTerms.proportional) * 2) {
            return "📊 Kd muito alto! Pode amplificar ruído do sistema";
        }
        
        if (metrics.iae < 30 && metrics.overshoot < 5) {
            return "✅ Excelente sintonia! Sistema bem controlado";
        }
        
        return "🔧 Ajuste os parâmetros e observe como cada termo afeta a resposta";
    }
}